/**
 * @fileoverview Cryptographic, formatting, and identifier utilities for ChainKit.
 * Provides deterministic hashing, JSON canonicalization, validation, and ID generation.
 *
 * @module @chainkit/shared/utils
 */

import { createHash, randomBytes } from 'node:crypto';

/**
 * Computes a SHA-256 hexadecimal digest of a UTF-8 string input.
 *
 * @param input - The string to hash.
 * @returns 64-character lowercase hex digest string.
 */
export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex').toLowerCase();
}

/**
 * Recursively orders object keys alphabetically while preserving array sequence
 * and primitive scalar values. Filters out `undefined` entries to conform to standard JSON serialization.
 *
 * @param value - Any JavaScript value or nested data structure.
 * @returns Deterministically key-sorted object representation.
 */
function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }

  const obj = value as Record<string, unknown>;
  const sortedKeys = Object.keys(obj).sort();
  const sortedObj: Record<string, unknown> = {};

  for (const key of sortedKeys) {
    const val = obj[key];
    if (val !== undefined) {
      sortedObj[key] = sortKeys(val);
    }
  }

  return sortedObj;
}

/**
 * Deterministically serializes a value into a canonical JSON string
 * with alphabetically sorted keys and no extraneous whitespace.
 *
 * @param obj - Any JSON-serializable value.
 * @returns Compact, canonical JSON string representation.
 */
export function canonicalizeJson(obj: unknown): string {
  const sorted = sortKeys(obj);
  return JSON.stringify(sorted);
}

/**
 * Validates whether a given string is a valid 32-byte hexadecimal hash (64 hex characters),
 * optionally prefixed with '0x' or '0X'.
 *
 * @param hash - Candidate hash string.
 * @returns True if the string is a valid 32-byte hex hash, false otherwise.
 */
export function isValidHexHash(hash: string): boolean {
  if (typeof hash !== 'string' || hash.trim().length === 0) {
    return false;
  }

  const clean = hash.startsWith('0x') || hash.startsWith('0X')
    ? hash.slice(2)
    : hash;

  if (clean.length !== 64) {
    return false;
  }

  return /^[0-9a-fA-F]{64}$/.test(clean);
}

/**
 * Converts a 64-character hexadecimal hash to EVM bytes32 format (0x-prefixed lowercase).
 *
 * @param hexHash - 64-char hex string (with or without existing 0x prefix).
 * @returns 0x-prefixed 32-byte EVM hex string (`0x${string}`).
 * @throws Error if the supplied hash is not a valid 32-byte hex hash.
 */
export function toBytes32(hexHash: string): `0x${string}` {
  if (!isValidHexHash(hexHash)) {
    throw new Error(`Invalid 32-byte hex hash: "${hexHash}" (expected 64 hex characters)`);
  }

  const clean = hexHash.startsWith('0x') || hexHash.startsWith('0X')
    ? hexHash.slice(2)
    : hexHash;

  return `0x${clean.toLowerCase()}`;
}

/**
 * Generates a unique request correlation identifier prefixed with 'req_'.
 *
 * @returns Unique request ID string (e.g. 'req_a1b2c3d4...').
 */
export function generateRequestId(): string {
  return `req_${randomBytes(12).toString('hex')}`;
}

/**
 * Generates a unique immutable record identifier prefixed with 'rec_'.
 *
 * @returns Unique record ID string (e.g. 'rec_a1b2c3d4...').
 */
export function generateRecordId(): string {
  return `rec_${randomBytes(12).toString('hex')}`;
}

/**
 * Generates a unique blockchain transaction tracking identifier prefixed with 'txn_'.
 *
 * @returns Unique transaction ID string (e.g. 'txn_a1b2c3d4...').
 */
export function generateTransactionId(): string {
  return `txn_${randomBytes(12).toString('hex')}`;
}

/**
 * Redacts an API key for safe display and logging.
 * Shows only the prefix (e.g. 'ck_test_' or 'ck_live_') plus first 4 characters of the secret,
 * followed by '...' for the remaining characters.
 *
 * @example
 * redactApiKey('ck_test_abcdef1234567890') // => 'ck_test_abcd...'
 *
 * @param key - The raw API key string to redact.
 * @returns Obfuscated API key string safe for logs and console display.
 */
export function redactApiKey(key: string): string {
  if (!key || typeof key !== 'string') {
    return '';
  }

  if (key.startsWith('ck_test_')) {
    const secret = key.slice('ck_test_'.length);
    const visibleSecret = secret.slice(0, 4);
    return `ck_test_${visibleSecret}...`;
  }

  if (key.startsWith('ck_live_')) {
    const secret = key.slice('ck_live_'.length);
    const visibleSecret = secret.slice(0, 4);
    return `ck_live_${visibleSecret}...`;
  }

  // Handle keys with an underscore prefix (e.g. custom_prefix_secret)
  const lastUnderscoreIdx = key.lastIndexOf('_');
  if (lastUnderscoreIdx !== -1 && lastUnderscoreIdx < key.length - 1) {
    const prefix = key.slice(0, lastUnderscoreIdx + 1);
    const secret = key.slice(lastUnderscoreIdx + 1);
    return `${prefix}${secret.slice(0, 4)}...`;
  }

  // Fallback if no recognizable prefix exists
  return `${key.slice(0, 8)}...`;
}
