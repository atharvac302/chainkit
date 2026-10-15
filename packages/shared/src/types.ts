/**
 * @fileoverview Platform-wide TypeScript type definitions for ChainKit.
 * Encompasses entity models, lifecycle enums, API request/response contracts, and verification results.
 *
 * @module @chainkit/shared/types
 */

/**
 * Record lifecycle status enum representing each state of a record.
 */
export enum RecordStatus {
  CREATED = 'created',
  SUBMITTING = 'submitting',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

/**
 * Union type representing valid record statuses.
 */
export type RecordStatusType = 'created' | 'submitting' | 'pending' | 'confirmed' | 'failed';

/**
 * Transaction lifecycle status enum for blockchain relayer tasks.
 */
export enum TransactionStatus {
  CREATED = 'created',
  SUBMITTING = 'submitting',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  FAILED = 'failed',
}

/**
 * Union type representing valid transaction statuses.
 */
export type TransactionStatusType = 'created' | 'submitting' | 'pending' | 'confirmed' | 'failed';

/**
 * Target deployment environment for projects, keys, and transactions.
 */
export type Environment = 'sandbox' | 'production';

/**
 * Lifecycle status of an API authentication key.
 */
export type ApiKeyStatus = 'active' | 'revoked' | 'expired';

/**
 * Tenant project entity in ChainKit.
 */
export interface Project {
  /** Unique project identifier (CUID). */
  id: string;
  /** Human-readable display name of the project. */
  name: string;
  /** ISO timestamp or Date when the project was created. */
  createdAt: Date | string;
}

/**
 * API key record used to authenticate tenant requests.
 */
export interface ApiKey {
  /** Unique API key record identifier. */
  id: string;
  /** Owning project identifier. */
  projectId: string;
  /** Public lookup prefix for the API key (e.g. 'ck_test_1234abcd'). */
  prefix: string;
  /** Operating environment: sandbox or production. */
  environment: Environment;
  /** Current active or revoked state of the key. */
  status: ApiKeyStatus;
  /** ISO timestamp or Date when the key was provisioned. */
  createdAt: Date | string;
  /** ISO timestamp or Date when the key was last used in an API call, if any. */
  lastUsedAt: Date | string | null;
}

/**
 * Immutable blockchain-anchored record entity.
 */
export interface Record {
  /** Unique record identifier (e.g. 'rec_12345678'). */
  id: string;
  /** Owning project identifier. */
  projectId: string;
  /** Domain classification / record schema type (e.g. 'invoice', 'audit_log'). */
  type: string;
  /** External identifier supplied by the caller system (e.g. internal UUID or order ID). */
  externalId: string | null;
  /** SHA-256 cryptographic digest of the record content. */
  contentHash: string;
  /** Current anchoring lifecycle status. */
  status: RecordStatus | RecordStatusType;
  /** Confirmed or pending on-chain transaction hash (0x-prefixed), if submitted. */
  transactionHash: string | null;
  /** ISO timestamp or Date when the record was created. */
  createdAt: Date | string;
  /** ISO timestamp or Date when the record was last modified. */
  updatedAt: Date | string;
}

/**
 * Blockchain relayer transaction entity tracking on-chain anchoring status.
 */
export interface Transaction {
  /** Unique transaction record identifier (e.g. 'txn_12345678'). */
  id: string;
  /** Identifier of the anchored record. */
  recordId: string;
  /** Target EVM chain ID where the transaction was submitted (e.g. 11155111 for Sepolia). */
  chainId: number;
  /** Blockchain transaction hash (0x-prefixed hex string), or null if not yet submitted. */
  transactionHash: string | null;
  /** Submission and confirmation status of the blockchain transaction. */
  status: TransactionStatus | TransactionStatusType | RecordStatus | RecordStatusType;
  /** Number of submission or confirmation retry attempts. */
  attempts: number;
  /** Machine-readable error code if the last submission failed. */
  lastErrorCode: string | null;
  /** ISO timestamp or Date when the transaction was broadcast to the network. */
  submittedAt: Date | string | null;
  /** ISO timestamp or Date when the transaction received block confirmation. */
  confirmedAt: Date | string | null;
}

/**
 * Idempotency tracking entry ensuring safe request retries without duplicate record generation.
 */
export interface IdempotencyEntry {
  /** Unique entry identifier. */
  id: string;
  /** Project scope for the idempotency key. */
  projectId: string;
  /** Client-provided idempotency key from header. */
  key: string;
  /** SHA-256 digest of the original request body for conflict detection. */
  requestHash: string;
  /** Record ID created by the initial request, if applicable. */
  recordId: string | null;
  /** Cached JSON response body returned on replay. */
  responseBody: string | null;
  /** ISO timestamp or Date when the idempotency entry was created. */
  createdAt: Date | string;
  /** ISO timestamp or Date when this idempotency entry expires. */
  expiresAt: Date | string;
}

/**
 * Result returned by the record verification endpoint evaluating cryptographic authenticity.
 */
export interface VerificationResult {
  /** Identifier of the record being verified. */
  recordId: string;
  /** Whether the candidate content or hash matches the stored record hash. */
  verified: boolean;
  /** Current status of the record in the system. */
  status: RecordStatus | RecordStatusType;
  /** Diagnostic human-readable explanation of the verification outcome. */
  reason: string;
}

/**
 * Structured details contained within an API error response.
 */
export interface ApiErrorDetail {
  /** Machine-readable error code string. */
  code: string;
  /** Human-readable error message. */
  message: string;
  /** Correlation ID for tracking and log inspection. */
  requestId: string;
  /** Supplementary structured error context (e.g. validation issues). */
  details?: unknown;
}

/**
 * Standard API error response body.
 */
export interface ApiErrorResponse {
  error: ApiErrorDetail;
}

/**
 * Generic API success response envelope.
 */
export interface ApiSuccessResponse<T> {
  /** Payload data. */
  data: T;
  /** Correlation ID for tracking and log inspection. */
  requestId: string;
}

/**
 * Pagination metadata and parameters.
 */
export interface PaginationParams {
  /** 1-based page index. */
  page: number;
  /** Maximum items per page. */
  limit: number;
}

/**
 * Paginated list response wrapper.
 */
export interface PaginatedResponse<T> {
  /** Array of items on the current page. */
  data: T[];
  /** Pagination metadata. */
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  /** Correlation ID. */
  requestId: string;
}

/**
 * Input payload for record creation.
 */
export interface CreateRecordInput {
  /** Domain-specific record classification. */
  type: string;
  /** Optional external reference ID from calling system. */
  externalId?: string;
  /** Raw content object to hash and anchor. */
  content?: globalThis.Record<string, unknown>;
  /** Pre-calculated SHA-256 hex digest. */
  contentHash?: string;
}

/**
 * Input payload for record verification.
 */
export interface VerifyRecordInput {
  /** Raw content object to hash and compare. */
  content?: globalThis.Record<string, unknown>;
  /** Pre-calculated SHA-256 hex digest to compare. */
  contentHash?: string;
}

/**
 * Input payload for API key generation.
 */
export interface CreateApiKeyInput {
  /** Optional descriptive name or label for the key. */
  name?: string;
  /** Target operating environment. */
  environment: Environment;
}

/**
 * Input payload for project creation.
 */
export interface CreateProjectInput {
  /** Display name for the project. */
  name: string;
}
