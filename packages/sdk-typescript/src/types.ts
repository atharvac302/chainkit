/**
 * ChainKit TypeScript SDK - Type Definitions
 *
 * Provides strongly typed definitions for all ChainKit client options,
 * request payloads, API responses, and error shapes.
 *
 * @module @chainkit/sdk/types
 */

/**
 * Configuration options required to instantiate the ChainKit SDK client.
 */
export interface ChainKitConfig {
  /**
   * Secret or service API key used for authenticating requests with the ChainKit platform.
   */
  apiKey: string;

  /**
   * Base URL of the ChainKit API service.
   * @default 'http://localhost:3001'
   */
  baseUrl?: string;

  /**
   * Network request timeout in milliseconds.
   * @default 30000 (30 seconds)
   */
  timeout?: number;
}

/**
 * Status of an anchored data record in ChainKit.
 */
export type RecordStatus = 'PENDING' | 'CONFIRMED' | 'FAILED' | string;

/**
 * Status of a blockchain transaction submitted by the relayer.
 */
export type TransactionStatus = 'PENDING' | 'SUBMITTED' | 'CONFIRMED' | 'FAILED' | string;

/**
 * Input parameters for anchoring a new data record.
 */
export interface CreateRecordInput {
  /**
   * Domain-specific record classification (e.g. "invoice", "audit_log", "certificate").
   */
  type: string;

  /**
   * External reference identifier from the calling system (e.g. internal UUID or order ID).
   */
  externalId: string;

  /**
   * Raw string payload or serialized document whose SHA-256 digest will be anchored.
   * When provided, the SDK or server calculates the digest automatically.
   */
  content?: string;

  /**
   * Pre-computed cryptographic hash (hex-encoded, 0x-prefixed or standard SHA-256)
   * representing the content. Required if `content` is omitted.
   */
  contentHash?: string;

  /**
   * Optional unique key to prevent duplicate record generation on retried requests.
   * Passed via the `Idempotency-Key` HTTP header.
   */
  idempotencyKey?: string;
}

/**
 * Input parameters for verifying the integrity of an existing record.
 */
export interface VerifyRecordInput {
  /**
   * Raw string payload to hash and compare against the on-chain recorded digest.
   */
  content?: string;

  /**
   * Pre-computed hash to compare against the on-chain recorded digest.
   */
  contentHash?: string;
}

/**
 * API response representing an anchored record.
 */
export interface RecordResponse {
  /**
   * Unique identifier of the record in ChainKit.
   */
  recordId: string;

  /**
   * Associated transaction identifier, or null/undefined if not yet submitted.
   */
  transactionId?: string | null;

  /**
   * Blockchain transaction hash (0x-prefixed hex string), or null if pending submission.
   */
  transactionHash?: string | null;

  /**
   * Current lifecycle status of the record ('PENDING', 'CONFIRMED', or 'FAILED').
   */
  status: RecordStatus;

  /**
   * SHA-256 cryptographic digest of the record content stored on-chain.
   */
  contentHash: string;

  /**
   * ISO 8601 UTC timestamp string of record creation.
   */
  createdAt: string;

  /**
   * Domain classification string.
   */
  type?: string;

  /**
   * External reference identifier provided at creation time.
   */
  externalId?: string;

  /**
   * ISO 8601 UTC timestamp string of last record modification.
   */
  updatedAt?: string;
}

/**
 * API response for record verification checks.
 */
export interface VerifyResponse {
  /**
   * Identifier of the record being verified.
   */
  recordId: string;

  /**
   * Whether the provided content/hash matches the on-chain record digest.
   */
  verified: boolean;

  /**
   * Status of the record at verification time ('CONFIRMED', 'PENDING', 'FAILED', etc.).
   */
  status: string;

  /**
   * Descriptive diagnostic reason when verification fails or status is unconfirmed.
   */
  reason?: string;
}

/**
 * API response representing a blockchain transaction submitted by ChainKit.
 */
export interface TransactionResponse {
  /**
   * Unique identifier of the transaction record in ChainKit.
   */
  id: string;

  /**
   * Identifier of the record associated with this transaction.
   */
  recordId: string;

  /**
   * Blockchain transaction hash (0x-prefixed), or null if pending.
   */
  transactionHash?: string | null;

  /**
   * Transaction submission and confirmation status.
   */
  status: TransactionStatus;

  /**
   * EVM Chain ID where the transaction was submitted (e.g. 11155111 for Sepolia).
   */
  chainId: number;

  /**
   * ISO 8601 UTC timestamp string when the transaction was submitted to the relayer/mempool.
   */
  submittedAt: string;

  /**
   * ISO 8601 UTC timestamp string when the transaction achieved block confirmation.
   */
  confirmedAt?: string | null;
}

/**
 * Generic paginated list response wrapper.
 */
export interface PaginatedResponse<T> {
  /**
   * Array of records for the requested page.
   */
  data: T[];

  /**
   * Total number of matching records across all pages.
   */
  total: number;

  /**
   * Current 1-based page number.
   */
  page: number;

  /**
   * Maximum records per page requested.
   */
  limit: number;
}

/**
 * Options for paginated list queries.
 */
export interface ListRecordsOptions {
  /**
   * Page number to retrieve (1-based index).
   * @default 1
   */
  page?: number;

  /**
   * Number of items per page.
   * @default 20
   */
  limit?: number;

  /**
   * Filter records by classification type.
   */
  type?: string;

  /**
   * Filter records by lifecycle status.
   */
  status?: string;
}

/**
 * Standard error response payload returned by the ChainKit API.
 */
export interface ChainKitErrorResponse {
  error: {
    /**
     * Machine-readable error code string (e.g. "RECORD_NOT_FOUND", "INVALID_INPUT").
     */
    code: string;

    /**
     * Human-readable diagnostic description of the error.
     */
    message: string;

    /**
     * Unique request tracking identifier for server-side correlation.
     */
    requestId?: string;

    /**
     * Optional structured validation details or error context.
     */
    details?: unknown;
  };
}

/**
 * Internal signature for executing HTTP requests against the ChainKit API.
 */
export type RequestFunction = <T>(
  method: string,
  path: string,
  body?: unknown,
  headers?: Record<string, string>
) => Promise<T>;
