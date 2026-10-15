import { describe, expect, it } from 'vitest';
import {
  createApiKeySchema,
  createProjectSchema,
  createRecordSchema,
  paginationSchema,
  verifyRecordSchema,
} from './schemas.js';

describe('schemas', () => {
  describe('createRecordSchema', () => {
    it('accepts valid input with content object', () => {
      const input = {
        type: 'invoice',
        externalId: 'ext_123',
        content: { total: 100, currency: 'USD' },
      };
      const result = createRecordSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('invoice');
        expect(result.data.externalId).toBe('ext_123');
        expect(result.data.content).toEqual({ total: 100, currency: 'USD' });
      }
    });

    it('accepts valid input with precomputed contentHash', () => {
      const input = {
        type: 'audit_log',
        contentHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      };
      const result = createRecordSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts 0x-prefixed contentHash', () => {
      const input = {
        type: 'certificate',
        contentHash: `0x${'a'.repeat(64)}`,
      };
      const result = createRecordSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('fails when neither content nor contentHash is provided', () => {
      const input = {
        type: 'invoice',
        externalId: 'ext_123',
      };
      const result = createRecordSchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Either content or contentHash must be provided');
      }
    });

    it('fails when type exceeds 80 characters', () => {
      const input = {
        type: 'a'.repeat(81),
        contentHash: 'a'.repeat(64),
      };
      const result = createRecordSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('fails when type is empty', () => {
      const input = {
        type: '',
        contentHash: 'a'.repeat(64),
      };
      const result = createRecordSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('fails when externalId exceeds 160 characters', () => {
      const input = {
        type: 'invoice',
        externalId: 'x'.repeat(161),
        contentHash: 'a'.repeat(64),
      };
      const result = createRecordSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('fails when contentHash is not valid 64-char hex string', () => {
      const input = {
        type: 'invoice',
        contentHash: 'invalid_non_hex_hash',
      };
      const result = createRecordSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('verifyRecordSchema', () => {
    it('accepts valid input with content', () => {
      const result = verifyRecordSchema.safeParse({ content: { key: 'value' } });
      expect(result.success).toBe(true);
    });

    it('accepts valid input with contentHash', () => {
      const result = verifyRecordSchema.safeParse({ contentHash: 'b'.repeat(64) });
      expect(result.success).toBe(true);
    });

    it('fails when neither content nor contentHash is provided', () => {
      const result = verifyRecordSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe('Either content or contentHash must be provided');
      }
    });
  });

  describe('createApiKeySchema', () => {
    it('defaults to sandbox environment when not specified', () => {
      const result = createApiKeySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.environment).toBe('sandbox');
      }
    });

    it('accepts valid production environment and name', () => {
      const result = createApiKeySchema.safeParse({
        name: 'Backend Production Key',
        environment: 'production',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Backend Production Key');
        expect(result.data.environment).toBe('production');
      }
    });

    it('rejects invalid environment value', () => {
      const result = createApiKeySchema.safeParse({
        environment: 'staging',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createProjectSchema', () => {
    it('accepts valid project name', () => {
      const result = createProjectSchema.safeParse({ name: 'Alpha Logistics' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Alpha Logistics');
      }
    });

    it('rejects empty name', () => {
      const result = createProjectSchema.safeParse({ name: '   ' });
      expect(result.success).toBe(false);
    });

    it('rejects name exceeding 100 characters', () => {
      const result = createProjectSchema.safeParse({ name: 'p'.repeat(101) });
      expect(result.success).toBe(false);
    });
  });

  describe('paginationSchema', () => {
    it('provides sensible defaults when empty', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(20);
      }
    });

    it('coerces string query values to numbers', () => {
      const result = paginationSchema.safeParse({ page: '3', limit: '50' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(3);
        expect(result.data.limit).toBe(50);
      }
    });

    it('rejects negative or zero page and limit', () => {
      expect(paginationSchema.safeParse({ page: 0 }).success).toBe(false);
      expect(paginationSchema.safeParse({ limit: -5 }).success).toBe(false);
    });

    it('enforces maximum limit of 100', () => {
      expect(paginationSchema.safeParse({ limit: 101 }).success).toBe(false);
      expect(paginationSchema.safeParse({ limit: 100 }).success).toBe(true);
    });
  });
});
