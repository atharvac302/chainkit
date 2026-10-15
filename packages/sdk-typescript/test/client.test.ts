/**
 * ChainKit TypeScript SDK - Comprehensive Unit Test Suite
 *
 * Tests the ChainKit client, record and transaction resources, error handling,
 * authentication headers, timeout management, and security guarantees.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  AuthenticationError,
  ChainKit,
  ChainKitError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  RateLimitError,
  ServerError,
  ValidationError,
} from '../src/index.js';

describe('ChainKit Client', () => {
  const originalFetch = globalThis.fetch;
  const mockApiKey = 'ck_test_live_secret_12345';
  const customBaseUrl = 'https://custom-api.chainkit.io';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe('Initialization and Configuration', () => {
    it('initializes with required apiKey and default options', () => {
      const client = new ChainKit({ apiKey: mockApiKey });
      expect(client).toBeInstanceOf(ChainKit);
      expect(client.records).toBeDefined();
      expect(client.transactions).toBeDefined();
    });

    it('throws ValidationError if apiKey is missing or empty', () => {
      expect(() => new ChainKit({ apiKey: '' })).toThrow(ValidationError);
      expect(() => new ChainKit({ apiKey: '   ' })).toThrow(ValidationError);
      // @ts-expect-error Testing invalid config at runtime
      expect(() => new ChainKit({})).toThrow(ValidationError);
      // @ts-expect-error Testing invalid config at runtime
      expect(() => new ChainKit(null)).toThrow(ValidationError);
    });

    it('supports custom baseUrl and strips trailing slash', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          recordId: 'rec_abc123',
          status: 'PENDING',
          contentHash: '0xhash',
          createdAt: '2026-10-14T12:00:00Z',
        }),
      });
      globalThis.fetch = fetchMock;

      const client = new ChainKit({
        apiKey: mockApiKey,
        baseUrl: `${customBaseUrl}/`,
      });

      await client.records.get('rec_abc123');

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [calledUrl] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(calledUrl).toBe(`${customBaseUrl}/v1/records/rec_abc123`);
    });
  });

  describe('Records Operations', () => {
    it('creates correct HTTP request for records.create', async () => {
      const mockResponseData = {
        recordId: 'rec_create_001',
        transactionId: 'tx_create_001',
        transactionHash: null,
        status: 'PENDING',
        contentHash: '0xaabbcc112233',
        createdAt: '2026-10-14T12:30:00Z',
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockResponseData,
      });
      globalThis.fetch = fetchMock;

      const client = new ChainKit({ apiKey: mockApiKey });
      const record = await client.records.create({
        type: 'invoice',
        externalId: 'inv_8899',
        content: JSON.stringify({ amount: 500, currency: 'USD' }),
      });

      expect(record).toEqual(mockResponseData);
      expect(fetchMock).toHaveBeenCalledTimes(1);

      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('http://localhost:3001/v1/records');
      expect(options.method).toBe('POST');
      expect((options.headers as Record<string, string>)['Authorization']).toBe(`Bearer ${mockApiKey}`);
      expect((options.headers as Record<string, string>)['Content-Type']).toBe('application/json');

      const body = JSON.parse(options.body as string);
      expect(body.type).toBe('invoice');
      expect(body.externalId).toBe('inv_8899');
      expect(body.content).toBeDefined();
    });

    it('supports idempotency key header on create', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          recordId: 'rec_idem_001',
          status: 'PENDING',
          contentHash: '0x1234',
          createdAt: '2026-10-14T12:30:00Z',
        }),
      });
      globalThis.fetch = fetchMock;

      const client = new ChainKit({ apiKey: mockApiKey });
      await client.records.create({
        type: 'receipt',
        externalId: 'rec_777',
        contentHash: '0x1234',
        idempotencyKey: 'idem-uuid-999',
      });

      const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      const headers = options.headers as Record<string, string>;
      expect(headers['Idempotency-Key']).toBe('idem-uuid-999');

      // The idempotency key should not be duplicated in the JSON payload
      const body = JSON.parse(options.body as string);
      expect(body.idempotencyKey).toBeUndefined();
    });

    it('validates required fields before calling fetch on create', async () => {
      const client = new ChainKit({ apiKey: mockApiKey });

      // @ts-expect-error Testing missing type
      await expect(client.records.create({ externalId: 'ext_1', content: 'test' })).rejects.toThrow(
        ValidationError
      );

      // @ts-expect-error Testing missing externalId
      await expect(client.records.create({ type: 'inv', content: 'test' })).rejects.toThrow(
        ValidationError
      );

      // Testing missing both content and contentHash
      await expect(client.records.create({ type: 'inv', externalId: 'ext_1' })).rejects.toThrow(
        ValidationError
      );
    });

    it('retrieves record by id via records.get', async () => {
      const mockRecord = {
        recordId: 'rec_xyz',
        transactionId: 'tx_xyz',
        transactionHash: '0x999',
        status: 'CONFIRMED',
        contentHash: '0xhash999',
        createdAt: '2026-10-14T12:00:00Z',
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockRecord,
      });
      globalThis.fetch = fetchMock;

      const client = new ChainKit({ apiKey: mockApiKey });
      const record = await client.records.get('rec_xyz');

      expect(record).toEqual(mockRecord);
      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('http://localhost:3001/v1/records/rec_xyz');
      expect(options.method).toBe('GET');
    });

    it('verifies record and returns correct boolean status', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            recordId: 'rec_v1',
            verified: true,
            status: 'CONFIRMED',
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({
            recordId: 'rec_v1',
            verified: false,
            status: 'CONFIRMED',
            reason: 'Content digest mismatch with on-chain value',
          }),
        });
      globalThis.fetch = fetchMock;

      const client = new ChainKit({ apiKey: mockApiKey });

      const verifiedResult = await client.records.verify('rec_v1', {
        content: 'authentic content',
      });
      expect(verifiedResult.verified).toBe(true);

      const unverifiedResult = await client.records.verify('rec_v1', {
        content: 'tampered content',
      });
      expect(unverifiedResult.verified).toBe(false);
      expect(unverifiedResult.reason).toContain('Content digest mismatch');
    });

    it('lists records with pagination parameters', async () => {
      const mockList = {
        data: [
          {
            recordId: 'rec_1',
            status: 'CONFIRMED',
            contentHash: '0x1',
            createdAt: '2026-10-14T00:00:00Z',
          },
        ],
        total: 1,
        page: 2,
        limit: 10,
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockList,
      });
      globalThis.fetch = fetchMock;

      const client = new ChainKit({ apiKey: mockApiKey });
      const result = await client.records.list({ page: 2, limit: 10, type: 'audit' });

      expect(result.data).toHaveLength(1);
      const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('page=2');
      expect(url).toContain('limit=10');
      expect(url).toContain('type=audit');
    });
  });

  describe('Transactions Operations', () => {
    it('retrieves transaction details via transactions.get', async () => {
      const mockTx = {
        id: 'tx_test_456',
        recordId: 'rec_test_123',
        transactionHash: '0xabc123456789def',
        status: 'CONFIRMED',
        chainId: 11155111,
        submittedAt: '2026-10-14T12:00:00Z',
        confirmedAt: '2026-10-14T12:00:15Z',
      };

      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockTx,
      });
      globalThis.fetch = fetchMock;

      const client = new ChainKit({ apiKey: mockApiKey });
      const tx = await client.transactions.get('tx_test_456');

      expect(tx).toEqual(mockTx);
      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('http://localhost:3001/v1/transactions/tx_test_456');
      expect(options.method).toBe('GET');
    });

    it('validates transactionId on get', async () => {
      const client = new ChainKit({ apiKey: mockApiKey });
      await expect(client.transactions.get('')).rejects.toThrow(ValidationError);
      // @ts-expect-error Invalid argument test
      await expect(client.transactions.get(null)).rejects.toThrow(ValidationError);
    });
  });

  describe('HTTP Status and Error Mapping', () => {
    const errorCases = [
      { status: 400, expectedClass: ValidationError, code: 'VALIDATION_ERROR' },
      { status: 401, expectedClass: AuthenticationError, code: 'AUTHENTICATION_ERROR' },
      { status: 403, expectedClass: AuthenticationError, code: 'FORBIDDEN' },
      { status: 404, expectedClass: NotFoundError, code: 'NOT_FOUND' },
      { status: 409, expectedClass: ConflictError, code: 'CONFLICT' },
      { status: 429, expectedClass: RateLimitError, code: 'RATE_LIMIT_EXCEEDED' },
      { status: 500, expectedClass: ServerError, code: 'SERVER_ERROR' },
      { status: 503, expectedClass: ServerError, code: 'SERVER_ERROR' },
    ];

    for (const { status, expectedClass, code } of errorCases) {
      it(`maps HTTP ${status} to ${expectedClass.name}`, async () => {
        const fetchMock = vi.fn().mockResolvedValue({
          ok: false,
          status,
          headers: new Headers({
            'content-type': 'application/json',
            'x-request-id': `req_status_${status}`,
          }),
          json: async () => ({
            error: {
              code,
              message: `Error corresponding to HTTP ${status}`,
              requestId: `req_status_${status}`,
            },
          }),
        });
        globalThis.fetch = fetchMock;

        const client = new ChainKit({ apiKey: mockApiKey });

        try {
          await client.records.get('rec_error_test');
          expect.fail('Expected request to throw an error');
        } catch (err: unknown) {
          expect(err).toBeInstanceOf(expectedClass);
          expect(err).toBeInstanceOf(ChainKitError);
          const ckErr = err as ChainKitError;
          expect(ckErr.statusCode).toBe(status);
          expect(ckErr.requestId).toBe(`req_status_${status}`);
          expect(ckErr.code).toBe(code);
        }
      });
    }

    it('specifically maps 403 to ForbiddenError extending AuthenticationError', async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient access rights',
          },
        }),
      });
      globalThis.fetch = fetchMock;

      const client = new ChainKit({ apiKey: mockApiKey });
      try {
        await client.records.get('rec_forbidden');
        expect.fail('Should throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ForbiddenError);
        expect(err).toBeInstanceOf(AuthenticationError);
        expect(err).toBeInstanceOf(ChainKitError);
      }
    });

    it('sends Authorization header without exposing key in error messages', async () => {
      // Simulate server echoing bad authorization header back in an error response
      const fetchMock = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          error: {
            code: 'INVALID_CREDENTIALS',
            message: `Key ${mockApiKey} is invalid or expired`,
          },
        }),
      });
      globalThis.fetch = fetchMock;

      const client = new ChainKit({ apiKey: mockApiKey });

      try {
        await client.records.get('rec_sensitive');
        expect.fail('Expected call to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(AuthenticationError);
        const error = err as AuthenticationError;
        // Key must NEVER appear in the error message
        expect(error.message).not.toContain(mockApiKey);
        expect(error.message).toContain('[REDACTED]');
      }
    });

    it('handles network timeout with AbortController', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      const fetchMock = vi.fn().mockRejectedValue(abortError);
      globalThis.fetch = fetchMock;

      const client = new ChainKit({ apiKey: mockApiKey, timeout: 50 });

      try {
        await client.records.get('rec_timeout');
        expect.fail('Expected timeout to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ChainKitError);
        const error = err as ChainKitError;
        expect(error.code).toBe('REQUEST_TIMEOUT');
        expect(error.statusCode).toBe(408);
      }
    });

    it('sanitizes api key if native network error mentions it', async () => {
      const networkError = new Error(`Connection failed to server with secret ${mockApiKey}`);
      const fetchMock = vi.fn().mockRejectedValue(networkError);
      globalThis.fetch = fetchMock;

      const client = new ChainKit({ apiKey: mockApiKey });

      try {
        await client.records.get('rec_net');
        expect.fail('Expected network error to throw');
      } catch (err: unknown) {
        expect(err).toBeInstanceOf(ChainKitError);
        const error = err as ChainKitError;
        expect(error.code).toBe('NETWORK_ERROR');
        expect(error.message).not.toContain(mockApiKey);
        expect(error.message).toContain('[REDACTED]');
      }
    });
  });
});
