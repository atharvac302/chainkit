import { PrismaClient } from '@prisma/client';
import { createPublicClient, http, type Hash, type TransactionReceipt } from 'viem';
import { mainnet, sepolia, hardhat } from 'viem/chains';
import pino from 'pino';
import 'dotenv/config';

// ─── Configuration ───────────────────────────────────────────────────────────

const POLL_INTERVAL_MS = parseInt(process.env.WORKER_POLL_INTERVAL_MS ?? '15000', 10);
const MAX_RETRY_ATTEMPTS = 10;
const CONFIRMATION_BLOCKS = 1;
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 60000;

// ─── Logger ──────────────────────────────────────────────────────────────────

const logger = pino({
  name: 'chainkit-worker',
  level: process.env.LOG_LEVEL ?? 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino/file', options: { destination: 1 } }
      : undefined,
});

// ─── Prisma Client ───────────────────────────────────────────────────────────

const prisma = new PrismaClient();

// ─── Viem Client ─────────────────────────────────────────────────────────────

function getChain(targetChainId: number) {
  switch (targetChainId) {
    case 1:
      return mainnet;
    case 11155111:
      return sepolia;
    default:
      return hardhat;
  }
}

const chainId = parseInt(process.env.CHAIN_ID ?? '31337', 10);
const rpcUrl = process.env.RPC_URL ?? 'http://127.0.0.1:8545';

const publicClient = createPublicClient({
  chain: getChain(chainId),
  transport: http(rpcUrl),
});

// ─── State ───────────────────────────────────────────────────────────────────

let isShuttingDown = false;
let pollTimeout: ReturnType<typeof setTimeout> | null = null;
let consecutiveRpcFailures = 0;

// ─── Core Logic ──────────────────────────────────────────────────────────────

/**
 * Fetches a transaction receipt, returning null if not yet available.
 * Tracks consecutive RPC failures for exponential backoff.
 */
async function getReceipt(txHash: Hash): Promise<TransactionReceipt | null> {
  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash });
    consecutiveRpcFailures = 0; // reset on success
    return receipt;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);

    // "transaction not found" is expected for pending txs — not an RPC failure
    if (message.includes('could not be found') || message.includes('not found')) {
      consecutiveRpcFailures = 0;
      return null;
    }

    consecutiveRpcFailures++;
    logger.warn(
      { txHash, error: message, consecutiveFailures: consecutiveRpcFailures },
      'RPC error fetching receipt',
    );
    return null;
  }
}

/**
 * Calculates exponential backoff delay based on consecutive RPC failures.
 */
function getBackoffDelay(): number {
  if (consecutiveRpcFailures === 0) return 0;
  const delay = Math.min(BASE_BACKOFF_MS * 2 ** (consecutiveRpcFailures - 1), MAX_BACKOFF_MS);
  return delay;
}

/**
 * Processes a single transaction: checks receipt, updates status.
 */
async function processTransaction(tx: {
  id: string;
  transactionHash: string | null;
  attempts: number;
  recordId: string;
}): Promise<void> {
  const { id, transactionHash, attempts, recordId } = tx;

  if (!transactionHash) {
    logger.warn({ transactionId: id }, 'Transaction has no transactionHash, skipping');
    return;
  }

  logger.debug({ transactionId: id, transactionHash }, 'Checking transaction');

  // Check retry limit
  if (attempts >= MAX_RETRY_ATTEMPTS) {
    logger.error(
      { transactionId: id, transactionHash, attempts },
      'Transaction exceeded max retry attempts, marking as failed',
    );
    await prisma.transaction.update({
      where: { id },
      data: {
        status: 'failed',
        lastErrorCode: `Exceeded maximum retry attempts (${MAX_RETRY_ATTEMPTS})`,
        updatedAt: new Date(),
      },
    });

    if (recordId) {
      await updateRecordStatus(recordId, 'failed');
    }
    return;
  }

  const receipt = await getReceipt(transactionHash as Hash);

  if (!receipt) {
    // Transaction not yet mined — increment retry attempts
    await prisma.transaction.update({
      where: { id },
      data: {
        attempts: attempts + 1,
        updatedAt: new Date(),
      },
    });
    logger.debug({ transactionId: id, transactionHash, attempts: attempts + 1 }, 'No receipt yet');
    return;
  }

  // Check block confirmations
  try {
    const currentBlock = await publicClient.getBlockNumber();
    const confirmations = Number(currentBlock - receipt.blockNumber);

    if (confirmations < CONFIRMATION_BLOCKS) {
      logger.debug(
        { transactionId: id, transactionHash, confirmations, required: CONFIRMATION_BLOCKS },
        'Waiting for confirmations',
      );
      return;
    }
  } catch (error) {
    logger.warn({ transactionId: id, error }, 'Failed to get current block number');
    return;
  }

  // Determine final status from receipt
  const finalStatus = receipt.status === 'success' ? 'confirmed' : 'failed';

  await prisma.transaction.update({
    where: { id },
    data: {
      status: finalStatus,
      confirmedAt: finalStatus === 'confirmed' ? new Date() : null,
      lastErrorCode: finalStatus === 'failed' ? 'Transaction reverted on-chain' : null,
      updatedAt: new Date(),
    },
  });

  logger.info(
    { transactionId: id, transactionHash, status: finalStatus, blockNumber: receipt.blockNumber.toString() },
    'Transaction finalized',
  );

  // Update parent record if linked
  if (recordId) {
    await updateRecordStatus(recordId, finalStatus === 'confirmed' ? 'anchored' : 'failed');
  }
}

/**
 * Updates the parent record's status based on transaction outcome.
 */
async function updateRecordStatus(recordId: string, status: string): Promise<void> {
  try {
    await prisma.record.update({
      where: { id: recordId },
      data: {
        status,
        updatedAt: new Date(),
      },
    });
    logger.info({ recordId, status }, 'Updated parent record status');
  } catch (error) {
    logger.error({ recordId, status, error }, 'Failed to update parent record status');
  }
}

/**
 * Main poll cycle: fetches pending/submitted transactions and processes them.
 */
async function pollTransactions(): Promise<void> {
  if (isShuttingDown) return;

  try {
    const transactions = await prisma.transaction.findMany({
      where: {
        status: { in: ['submitted', 'pending'] },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (transactions.length > 0) {
      logger.info({ count: transactions.length }, 'Processing pending transactions');
    } else {
      logger.debug('No pending transactions');
    }

    for (const tx of transactions) {
      if (isShuttingDown) break;

      try {
        await processTransaction(tx);
      } catch (error) {
        logger.error(
          { transactionId: tx.id, error },
          'Unexpected error processing transaction',
        );
      }
    }
  } catch (error) {
    logger.error({ error }, 'Error querying transactions from database');
  }

  // Schedule next poll with optional backoff
  if (!isShuttingDown) {
    const backoff = getBackoffDelay();
    const nextInterval = POLL_INTERVAL_MS + backoff;

    if (backoff > 0) {
      logger.warn(
        { backoffMs: backoff, nextPollMs: nextInterval, consecutiveRpcFailures },
        'Applying exponential backoff due to RPC failures',
      );
    }

    pollTimeout = setTimeout(pollTransactions, nextInterval);
  }
}

// ─── Graceful Shutdown ───────────────────────────────────────────────────────

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, 'Received shutdown signal, gracefully stopping...');

  if (pollTimeout) {
    clearTimeout(pollTimeout);
    pollTimeout = null;
  }

  try {
    await prisma.$disconnect();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error({ error }, 'Error disconnecting from database');
  }

  logger.info('Worker shutdown complete');
  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught exception');
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled rejection');
  shutdown('unhandledRejection');
});

// ─── Startup ─────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  logger.info(
    {
      pollIntervalMs: POLL_INTERVAL_MS,
      maxRetries: MAX_RETRY_ATTEMPTS,
      confirmationBlocks: CONFIRMATION_BLOCKS,
      chainId,
      rpcUrl,
    },
    'ChainKit Transaction Worker starting',
  );

  // Verify database connectivity
  try {
    await prisma.$connect();
    logger.info('Connected to database');
  } catch (error) {
    logger.fatal({ error }, 'Failed to connect to database');
    process.exit(1);
  }

  // Verify RPC connectivity
  try {
    const blockNumber = await publicClient.getBlockNumber();
    logger.info({ blockNumber: blockNumber.toString() }, 'Connected to RPC node');
  } catch (error) {
    logger.warn({ error }, 'Failed to connect to RPC node — will retry during polling');
  }

  // Start polling
  logger.info('Starting transaction poll loop');
  await pollTransactions();
}

main().catch((error) => {
  logger.fatal({ error }, 'Fatal error during worker startup');
  process.exit(1);
});
