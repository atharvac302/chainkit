import { describe, expect, it } from 'vitest';
import {
  canonicalizeJson,
  generateRecordId,
  generateRequestId,
  generateTransactionId,
  isValidHexHash,
  redactApiKey,
  sha256Hex,
  toBytes32,
} from './utils.js';

describe('utils', () => {
  describe('sha256Hex', () => {
    it('computes expected SHA-256 hex digest for empty string', () => {
      // Known empty string SHA-256 hash
      expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    });

    it('computes expected SHA-256 hex digest for UTF-8 test string', () => {
      // Known SHA-256 of "hello world"
      expect(sha256Hex('hello world')).toBe('b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9');
    });

    it('returns lowercase 64-character hex string', () => {
      const hash = sha256Hex('ChainKit Blockchain-as-a-Service');
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe('canonicalizeJson', () => {
    it('produces deterministic output regardless of key insertion order', () => {
      const obj1 = { b: 2, a: 1, c: { y: 20, x: 10 } };
      const obj2 = { c: { x: 10, y: 20 }, a: 1, b: 2 };
      expect(canonicalizeJson(obj1)).toBe(canonicalizeJson(obj2));
      expect(canonicalizeJson(obj1)).toBe('{"a":1,"b":2,"c":{"x":10,"y":20}}');
    });

    it('handles nested objects, arrays, and primitive types', () => {
      const complex = {
        z: true,
        a: null,
        m: [3, 2, 1],
        k: 'text',
        nested: { b: 2, a: 1 },
      };
      const canonical = canonicalizeJson(complex);
      expect(canonical).toBe('{"a":null,"k":"text","m":[3,2,1],"nested":{"a":1,"b":2},"z":true}');
    });

    it('omits undefined properties', () => {
      const obj = { b: undefined, a: 1, c: 'hello' };
      expect(canonicalizeJson(obj)).toBe('{"a":1,"c":"hello"}');
    });

    it('handles primitives directly', () => {
      expect(canonicalizeJson('simple string')).toBe('"simple string"');
      expect(canonicalizeJson(12345)).toBe('12345');
      expect(canonicalizeJson(null)).toBe('null');
      expect(canonicalizeJson(true)).toBe('true');
    });
  });

  describe('isValidHexHash', () => {
    it('returns true for 64-char lowercase hex string', () => {
      const hash = 'a'.repeat(64);
      expect(isValidHexHash(hash)).toBe(true);
    });

    it('returns true for 64-char hex string with 0x prefix', () => {
      const hash = `0x${'f'.repeat(64)}`;
      expect(isValidHexHash(hash)).toBe(true);
    });

    it('returns true for mixed-case hex string', () => {
      const hash = '0123456789abcdefABCDEF0123456789abcdefABCDEF0123456789abcdefABCDEF'.slice(0, 64);
      expect(isValidHexHash(hash)).toBe(true);
    });

    it('returns false for strings of invalid length', () => {
      expect(isValidHexHash('a'.repeat(63))).toBe(false);
      expect(isValidHexHash('a'.repeat(65))).toBe(false);
      expect(isValidHexHash('')).toBe(false);
    });

    it('returns false for non-hexadecimal characters', () => {
      expect(isValidHexHash('z'.repeat(64))).toBe(false);
      expect(isValidHexHash(`${'a'.repeat(63)}g`)).toBe(false);
    });
  });

  describe('toBytes32', () => {
    it('converts a 64-char hex string to 0x-prefixed lowercase format', () => {
      const raw = 'A'.repeat(64);
      expect(toBytes32(raw)).toBe(`0x${'a'.repeat(64)}`);
    });

    it('preserves existing 0x-prefixed valid hex hash in lowercase', () => {
      const raw = `0x${'B'.repeat(64)}`;
      expect(toBytes32(raw)).toBe(`0x${'b'.repeat(64)}`);
    });

    it('throws error for invalid hex hash', () => {
      expect(() => toBytes32('short')).toThrow('Invalid 32-byte hex hash');
      expect(() => toBytes32('g'.repeat(64))).toThrow('Invalid 32-byte hex hash');
    });
  });

  describe('ID generators', () => {
    it('generateRequestId generates unique req_ prefixed IDs', () => {
      const id1 = generateRequestId();
      const id2 = generateRequestId();
      expect(id1.startsWith('req_')).toBe(true);
      expect(id2.startsWith('req_')).toBe(true);
      expect(id1).not.toBe(id2);
      expect(id1.length).toBeGreaterThan(10);
    });

    it('generateRecordId generates unique rec_ prefixed IDs', () => {
      const id1 = generateRecordId();
      const id2 = generateRecordId();
      expect(id1.startsWith('rec_')).toBe(true);
      expect(id2.startsWith('rec_')).toBe(true);
      expect(id1).not.toBe(id2);
      expect(id1.length).toBeGreaterThan(10);
    });

    it('generateTransactionId generates unique txn_ prefixed IDs', () => {
      const id1 = generateTransactionId();
      const id2 = generateTransactionId();
      expect(id1.startsWith('txn_')).toBe(true);
      expect(id2.startsWith('txn_')).toBe(true);
      expect(id1).not.toBe(id2);
      expect(id1.length).toBeGreaterThan(10);
    });
  });

  describe('redactApiKey', () => {
    it('redacts test key showing prefix and first 4 chars of secret followed by ellipsis', () => {
      const key = 'ck_test_1234567890abcdef12345678';
      expect(redactApiKey(key)).toBe('ck_test_1234...');
    });

    it('redacts live key showing prefix and first 4 chars of secret followed by ellipsis', () => {
      const key = 'ck_live_abcdef9876543210zyxwvu';
      expect(redactApiKey(key)).toBe('ck_live_abcd...');
    });

    it('redacts underscore-delimited custom keys', () => {
      const key = 'custom_key_secr99887766';
      expect(redactApiKey(key)).toBe('custom_key_secr...');
    });

    it('handles empty or non-string gracefully', () => {
      expect(redactApiKey('')).toBe('');
      expect(redactApiKey(null as unknown as string)).toBe('');
    });
  });
});
