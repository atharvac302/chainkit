/**
 * @fileoverview Platform-wide constants for ChainKit.
 * Defines API key formats, network limits, supported blockchain networks, and status arrays.
 *
 * @module @chainkit/shared/constants
 */

/**
 * Prefix identifying test/sandbox environment API keys.
 */
export const API_KEY_PREFIX_TEST = 'ck_test_' as const;

/**
 * Prefix identifying production/live environment API keys.
 */
export const API_KEY_PREFIX_LIVE = 'ck_live_' as const;

/**
 * Standard character length of generated full API keys.
 */
export const API_KEY_LENGTH = 48 as const;

/**
 * Maximum permitted HTTP request payload size in bytes (1 Megabyte = 1,048,576 bytes).
 */
export const MAX_BODY_SIZE = 1048576 as const;

/**
 * Rate limit sliding window duration in milliseconds (60,000 ms = 1 minute).
 */
export const RATE_LIMIT_WINDOW_MS = 60000 as const;

/**
 * Maximum requests allowed per rate limit window for standard tier API keys.
 */
export const RATE_LIMIT_MAX_REQUESTS = 100 as const;

/**
 * Standard cryptographic hashing algorithm used for deterministic content digests.
 */
export const CONTENT_HASH_ALGORITHM = 'sha256' as const;

/**
 * Ethereum Sepolia testnet EVM chain ID.
 */
export const SEPOLIA_CHAIN_ID = 11155111 as const;

/**
 * Read-only array of supported EVM chain IDs for blockchain anchoring.
 */
export const SUPPORTED_CHAIN_IDS = [11155111] as const;

/**
 * Lifecycle statuses for an immutable record in the ChainKit platform.
 */
export const RECORD_STATUSES = [
  'created',
  'submitting',
  'pending',
  'confirmed',
  'failed',
] as const;

/**
 * Lifecycle statuses for on-chain transactions submitted by the relayer.
 */
export const TRANSACTION_STATUSES = [
  'created',
  'submitting',
  'pending',
  'confirmed',
  'failed',
] as const;

/**
 * Valid lifecycle statuses for API keys.
 */
export const API_KEY_STATUSES = ['active', 'revoked', 'expired'] as const;

/**
 * Valid platform environments.
 */
export const ENVIRONMENTS = ['sandbox', 'production'] as const;
