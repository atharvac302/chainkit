/**
 * @fileoverview Record service encapsulating core business logic for records, content hashing,
 * idempotency enforcement, and blockchain anchoring.
 */

import type { PrismaClient, Record as PrismaRecord, Transaction as PrismaTransaction } from '@prisma/client';
import { env } from '../../config/env.js';
import {
  canonicalizeJson,
  sha256Hex,
} from '../../lib/crypto.js';
import {
  conflictError,
  notFoundError,
  validationError,
} from '../../lib/errors.js';
import {
  TransactionService,
  defaultBlockchainAdapter,
} from '../transactions/service.js';
import type { BlockchainAdapter } from '../transactions/blockchain-adapter.js';

/**
 * Payload input for creating a new immutable record.
 */
export interface CreateRecordInput {
  type: string;
  externalReference?: string;
  content?: unknown;
  contentHash?: string;
}

/**
 * Result returned upon record creation.
 */
export interface CreateRecordResult {
  record: PrismaRecord;
  transaction: PrismaTransaction;
  isIdempotentReplay?: boolean;
}

/**
 * Input for verifying record content integrity.
 */
export interface VerifyRecordInput {
  content?: unknown;
  contentHash?: string;
}

/**
 * Result of record verification.
 */
export interface VerifyRecordResult {
  verified: boolean;
  reason: string;
  status: string;
  contentHash: string;
  onChainAnchored: boolean;
}

/**
 * Pagination options for listing records.
 */
export interface ListRecordsPagination {
  page?: number;
  limit?: number;
  type?: string;
  status?: string;
}

/**
 * Paginated list response for records.
 */
export interface PaginatedRecordsResult {
  records: (PrismaRecord & { transactions: PrismaTransaction[] })[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

/**
 * Record service handling record creation, content canonicalization, hash verification,
 * and tenant-isolated operations.
 */
export class RecordService {
  private readonly transactionService: TransactionService;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly adapter: BlockchainAdapter = defaultBlockchainAdapter
  ) {
    this.transactionService = new TransactionService(prisma, adapter);
  }

  /**
   * Resolves the 32-byte content hash from either direct hash or canonicalized JSON content.
   */
  private resolveContentHash(input: CreateRecordInput): string {
    if (input.contentHash && input.contentHash.trim().length > 0) {
      const clean = input.contentHash.trim().toLowerCase().replace(/^0x/, '');
      if (clean.length !== 64 || !/^[0-9a-f]{64}$/.test(clean)) {
        throw validationError('contentHash must be a 32-byte hex string (64 hex characters)');
      }
      return clean;
    }

    if (input.content !== undefined && input.content !== null) {
      const canonicalJson = canonicalizeJson(input.content);
      return sha256Hex(canonicalJson);
    }

    throw validationError('Either content or contentHash must be provided');
  }

  /**
   * Creates a new record with transaction and idempotency support.
   *
   * @param projectId - Authenticated tenant project ID.
   * @param input - Record creation parameters.
   * @param idempotencyKey - Optional idempotency key from header.
   * @returns Created or replayed record and transaction.
   */
  public async createRecord(
    projectId: string,
    input: CreateRecordInput,
    idempotencyKey?: string
  ): Promise<CreateRecordResult> {
    const contentHash = this.resolveContentHash(input);

    // 1. Idempotency handling
    if (idempotencyKey) {
      const requestPayloadString = canonicalizeJson(input);
      const requestHash = sha256Hex(requestPayloadString);

      const existingEntry = await this.prisma.idempotencyEntry.findUnique({
        where: {
          projectId_key: {
            projectId,
            key: idempotencyKey,
          },
        },
      });

      if (existingEntry) {
        if (existingEntry.expiresAt < new Date()) {
          // Expired entry - delete to allow reuse
          await this.prisma.idempotencyEntry.delete({
            where: { id: existingEntry.id },
          });
        } else if (existingEntry.requestHash !== requestHash) {
          throw conflictError(
            `Idempotency key '${idempotencyKey}' was already used with a different request payload`
          );
        } else if (existingEntry.recordId) {
          const replayedRecord = await this.prisma.record.findUnique({
            where: { id: existingEntry.recordId },
            include: { transactions: { orderBy: { createdAt: 'desc' }, take: 1 } },
          });

          if (replayedRecord && replayedRecord.transactions[0]) {
            return {
              record: replayedRecord,
              transaction: replayedRecord.transactions[0],
              isIdempotentReplay: true,
            };
          }
        }
      }
    }

    // 2. Persist record and transaction in database
    const { record, transaction } = await this.prisma.$transaction(async (tx) => {
      const rec = await tx.record.create({
        data: {
          projectId,
          type: input.type,
          externalReference: input.externalReference ?? null,
          contentHash,
          status: 'created',
        },
      });

      const transactionRecord = await tx.transaction.create({
        data: {
          recordId: rec.id,
          chainId: env.CHAIN_ID,
          status: 'created',
          attempts: 0,
        },
      });

      if (idempotencyKey) {
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hour TTL
        const requestHash = sha256Hex(canonicalizeJson(input));

        await tx.idempotencyEntry.create({
          data: {
            projectId,
            key: idempotencyKey,
            requestHash,
            recordId: rec.id,
            expiresAt,
          },
        });
      }

      return { record: rec, transaction: transactionRecord };
    });

    // 3. Submit transaction to blockchain
    let submittedTx = transaction;
    try {
      submittedTx = await this.transactionService.submitToChain(
        transaction.id,
        contentHash,
        input.externalReference
      );
    } catch {
      // Submission failure was logged and marked in DB by submitToChain
    }

    return {
      record: { ...record, status: submittedTx.status === 'submitted' ? 'pending' : record.status },
      transaction: submittedTx,
    };
  }

  /**
   * Retrieves a single record scoped to tenant project.
   *
   * @param projectId - Authenticated tenant project ID.
   * @param recordId - Record identifier.
   * @returns Record with its transactions.
   */
  public async getRecord(
    projectId: string,
    recordId: string
  ): Promise<PrismaRecord & { transactions: PrismaTransaction[] }> {
    const record = await this.prisma.record.findFirst({
      where: {
        id: recordId,
        projectId,
      },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!record) {
      throw notFoundError(`Record with ID ${recordId} not found`);
    }

    return record;
  }

  /**
   * Verifies the authenticity of record data against its stored cryptographic hash and on-chain state.
   *
   * @param projectId - Authenticated tenant project ID.
   * @param recordId - Target record ID.
   * @param input - Content or contentHash to verify against stored hash.
   * @returns Verification result with status.
   */
  public async verifyRecord(
    projectId: string,
    recordId: string,
    input: VerifyRecordInput
  ): Promise<VerifyRecordResult> {
    const record = await this.getRecord(projectId, recordId);

    let candidateHash: string;

    if (input.contentHash && input.contentHash.trim().length > 0) {
      candidateHash = input.contentHash.trim().toLowerCase().replace(/^0x/, '');
    } else if (input.content !== undefined && input.content !== null) {
      const canonicalJson = canonicalizeJson(input.content);
      candidateHash = sha256Hex(canonicalJson).toLowerCase().replace(/^0x/, '');
    } else {
      throw validationError('Must provide content or contentHash to perform verification');
    }

    const storedHash = record.contentHash.toLowerCase().replace(/^0x/, '');
    const isHashMatch = candidateHash === storedHash;

    let onChainAnchored = false;
    try {
      onChainAnchored = await this.adapter.isAnchored(record.contentHash);
    } catch {
      // Best-effort check on-chain
      onChainAnchored = false;
    }

    if (!isHashMatch) {
      return {
        verified: false,
        reason: 'Hash mismatch: Provided payload does not match stored content hash',
        status: record.status,
        contentHash: record.contentHash,
        onChainAnchored,
      };
    }

    return {
      verified: true,
      reason: onChainAnchored
        ? 'Content hash verified and anchored on blockchain'
        : 'Content hash verified against registered record',
      status: record.status,
      contentHash: record.contentHash,
      onChainAnchored,
    };
  }

  /**
   * Retrieves a paginated list of records for the project.
   *
   * @param projectId - Authenticated tenant project ID.
   * @param pagination - Page, limit, and optional type/status filters.
   * @returns Paginated records list.
   */
  public async listRecords(
    projectId: string,
    pagination: ListRecordsPagination
  ): Promise<PaginatedRecordsResult> {
    const page = Math.max(1, pagination.page ?? 1);
    const limit = Math.min(100, Math.max(1, pagination.limit ?? 20));
    const skip = (page - 1) * limit;

    const where: {
      projectId: string;
      type?: string;
      status?: string;
    } = {
      projectId,
    };

    if (pagination.type) {
      where.type = pagination.type;
    }
    if (pagination.status) {
      where.status = pagination.status;
    }

    const [total, records] = await Promise.all([
      this.prisma.record.count({ where }),
      this.prisma.record.findMany({
        where,
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const pages = Math.ceil(total / limit);

    return {
      records,
      pagination: {
        total,
        page,
        limit,
        pages,
      },
    };
  }
}
