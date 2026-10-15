/**
 * @fileoverview Transaction service managing state transitions, blockchain submission, and receipt queries.
 */

import type { PrismaClient, Transaction } from '@prisma/client';
import { env } from '../../config/env.js';
import { notFoundError, AppError } from '../../lib/errors.js';
import {
  EvmBlockchainAdapter,
  type BlockchainAdapter,
} from './blockchain-adapter.js';

/**
 * Valid transaction lifecycle statuses.
 */
export type TransactionStatus = 'created' | 'submitted' | 'confirmed' | 'failed';

/**
 * Default blockchain adapter instance configured from environment variables.
 */
export const defaultBlockchainAdapter: BlockchainAdapter = new EvmBlockchainAdapter({
  rpcUrl: env.RPC_URL,
  chainId: env.CHAIN_ID,
  contractAddress: env.RECORD_REGISTRY_ADDRESS,
  relayerPrivateKey: env.RELAYER_PRIVATE_KEY,
});

/**
 * Allowed status transitions for state machine enforcement.
 */
const ALLOWED_TRANSITIONS: Record<TransactionStatus, TransactionStatus[]> = {
  created: ['submitted', 'failed'],
  submitted: ['confirmed', 'failed', 'submitted'],
  failed: ['submitted'], // retry allowed
  confirmed: [], // terminal state
};

/**
 * Transaction Service managing database transactions and blockchain interactions.
 */
export class TransactionService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly adapter: BlockchainAdapter = defaultBlockchainAdapter
  ) {}

  /**
   * Retrieves a transaction by ID, strictly scoped to the tenant's project.
   * If the transaction is submitted, attempts to sync receipt status on-the-fly.
   *
   * @param transactionId - The transaction record ID.
   * @param projectId - The tenant project ID for authorization.
   * @returns The transaction record.
   */
  public async getTransaction(
    transactionId: string,
    projectId: string
  ): Promise<Transaction & { record: { id: string; projectId: string; contentHash: string; status: string } }> {
    const tx = await this.prisma.transaction.findFirst({
      where: {
        id: transactionId,
        record: {
          projectId,
        },
      },
      include: {
        record: {
          select: {
            id: true,
            projectId: true,
            contentHash: true,
            status: true,
          },
        },
      },
    });

    if (!tx) {
      throw notFoundError(`Transaction with ID ${transactionId} not found`);
    }

    // Auto-sync status if transaction was submitted but not yet confirmed/failed
    if (tx.status === 'submitted' && tx.transactionHash) {
      try {
        const receipt = await this.adapter.getReceipt(tx.transactionHash);
        if (receipt.status === 'success') {
          const updated = await this.updateTransactionStatus(tx.id, 'confirmed', {
            confirmedAt: new Date(),
          });
          // Update parent record status
          await this.prisma.record.update({
            where: { id: tx.recordId },
            data: { status: 'confirmed' },
          });
          return { ...updated, record: tx.record };
        } else if (receipt.status === 'reverted') {
          const updated = await this.updateTransactionStatus(tx.id, 'failed', {
            errorCode: 'TX_REVERTED',
          });
          await this.prisma.record.update({
            where: { id: tx.recordId },
            data: { status: 'failed' },
          });
          return { ...updated, record: tx.record };
        }
      } catch {
        // Ignore background sync errors; return current state
      }
    }

    return tx;
  }

  /**
   * Enforces valid state machine transition and updates transaction status in DB.
   *
   * @param transactionId - The transaction ID.
   * @param nextStatus - The target transaction status.
   * @param options - Additional metadata (txHash, errorCode, confirmedAt).
   * @returns Updated transaction.
   */
  public async updateTransactionStatus(
    transactionId: string,
    nextStatus: TransactionStatus,
    options?: {
      transactionHash?: string;
      errorCode?: string;
      confirmedAt?: Date;
    }
  ): Promise<Transaction> {
    const current = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!current) {
      throw notFoundError(`Transaction ${transactionId} not found`);
    }

    const currentStatus = current.status as TransactionStatus;
    const allowed = ALLOWED_TRANSITIONS[currentStatus];

    if (currentStatus !== nextStatus && (!allowed || !allowed.includes(nextStatus))) {
      throw new AppError(
        'INVALID_STATE_TRANSITION',
        400,
        `Cannot transition transaction status from '${currentStatus}' to '${nextStatus}'`
      );
    }

    return this.prisma.transaction.update({
      where: { id: transactionId },
      data: {
        status: nextStatus,
        transactionHash: options?.transactionHash ?? current.transactionHash,
        lastErrorCode: options?.errorCode ?? current.lastErrorCode,
        confirmedAt: options?.confirmedAt ?? current.confirmedAt,
      },
    });
  }

  /**
   * Submits a transaction to the blockchain via the adapter and records the txHash.
   *
   * @param transactionId - The transaction ID.
   * @param recordHash - The 32-byte content hash to anchor.
   * @param externalReference - Optional external reference string.
   * @returns The updated transaction.
   */
  public async submitToChain(
    transactionId: string,
    recordHash: string,
    externalReference?: string
  ): Promise<Transaction> {
    const tx = await this.prisma.transaction.findUnique({
      where: { id: transactionId },
    });

    if (!tx) {
      throw notFoundError(`Transaction ${transactionId} not found`);
    }

    try {
      const txHash = await this.adapter.anchor(recordHash, externalReference ?? '');

      const updated = await this.prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'submitted',
          transactionHash: txHash,
          submittedAt: new Date(),
          attempts: { increment: 1 },
          lastErrorCode: null,
        },
      });

      // Update associated record status to pending/submitted
      await this.prisma.record.update({
        where: { id: tx.recordId },
        data: { status: 'submitted' },
      });

      return updated;
    } catch (error: unknown) {
      const errorCode =
        error instanceof AppError ? error.code : 'CHAIN_SUBMISSION_FAILED';

      await this.prisma.transaction.update({
        where: { id: transactionId },
        data: {
          status: 'failed',
          attempts: { increment: 1 },
          lastErrorCode: errorCode,
        },
      });

      await this.prisma.record.update({
        where: { id: tx.recordId },
        data: { status: 'failed' },
      });

      throw error;
    }
  }
}
