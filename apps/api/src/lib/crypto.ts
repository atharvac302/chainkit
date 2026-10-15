/**
 * @fileoverview Cryptographic and hashing utilities for API keys, JSON canonicalization, and content hashing.
 */

import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

/**
 * Result of API key generation.
 */
export interface GeneratedApiKey {
  fullKey: string;
  prefix: string;
  hash: string;
}

/**
 * Generates an HMAC-SHA256 hash of the API key secret combined with the server pepper.
 *
 * @param secret - Raw secret portion of the API key.
 * @param pepper - Server-side secret pepper.
 * @returns 64-character hex-encoded HMAC string.
 */
export function hashApiKeySecret(secret: string, pepper: string): string {
  return createHmac('sha256', pepper).update(secret, 'utf8').digest('hex');
}

/**
 * Timing-safe verification of an API key secret against a stored hash.
 *
 * @param secret - The candidate secret string.
 * @param hash - The expected HMAC-SHA256 hex string from the database.
 * @param pepper - Server-side secret pepper.
 * @returns True if the secret matches the hash, false otherwise.
 */
export function verifyApiKeySecret(secret: string, hash: string, pepper: string): boolean {
  if (!secret || !hash || !pepper) {
    return false;
  }

  const candidateHash = hashApiKeySecret(secret, pepper);
  const expectedBuffer = Buffer.from(hash, 'hex');
  const candidateBuffer = Buffer.from(candidateHash, 'hex');

  if (expectedBuffer.length !== candidateBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, candidateBuffer);
}

/**
 * Generates a cryptographically secure API key with environment-specific prefix.
 *
 * @param environment - Target environment ('live' | 'production' | 'sandbox' | 'test').
 * @param pepper - Optional pepper override (defaults to env.API_KEY_PEPPER).
 * @returns Object containing the full display key (revealed once), key prefix, and hashed secret.
 */
export function generateApiKey(environment: string, pepper?: string): GeneratedApiKey {
  const isLive = environment.toLowerCase() === 'live' || environment.toLowerCase() === 'production';
  const envTag = isLive ? 'live' : 'test';

  // 8 random hex characters for the prefix identifier
  const prefixRandom = randomBytes(4).toString('hex');
  const prefix = `ck_${envTag}_${prefixRandom}`;

  // 24 random bytes base64url encoded for 32 high-entropy characters
  const secret = randomBytes(24).toString('base64url');

  const fullKey = `${prefix}_${secret}`;
  const effectivePepper = pepper ?? env.API_KEY_PEPPER;
  const hash = hashApiKeySecret(secret, effectivePepper);

  return {
    fullKey,
    prefix,
    hash,
  };
}

/**
 * Computes standard SHA-256 hex digest of a string or Buffer.
 *
 * @param input - The string or buffer to hash.
 * @returns 64-character lowercase hex string.
 */
export function sha256Hex(input: string | Buffer): string {
  return createHash('sha256').update(input).digest('hex');
}

/**
 * Converts any SHA-256 hex string to an EVM-compatible 0x-prefixed 32-byte hex string.
 *
 * @param hex - 64-char hex string with or without 0x prefix.
 * @returns EVM formatted `0x${string}`.
 */
export function toBytes32Hex(hex: string): `0x${string}` {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length !== 64) {
    throw new Error(`Invalid 32-byte hex length: ${clean.length} (expected 64)`);
  }
  return `0x${clean.toLowerCase()}`;
}

/**
 * Recursively canonicalizes a JSON-compatible value by sorting object keys alphabetically.
 * Preserves array ordering and primitive types.
 *
 * @param value - Any JSON serializable value.
 * @returns Deterministically sorted JSON representation.
 */
function sortKeys(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    return value;
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
 * Produces deterministic, canonical JSON string with recursively sorted keys.
 *
 * @param obj - The JavaScript object or value to serialize.
 * @returns Deterministic JSON string.
 */
export function canonicalizeJson(obj: unknown): string {
  const sorted = sortKeys(obj);
  return JSON.stringify(sorted);
}
