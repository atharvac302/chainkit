import { describe, expect, it } from 'vitest';
import {
  ChainKitError,
  ErrorCode,
  HttpStatus,
  createErrorResponse,
  createIdempotencyConflictError,
  createInternalError,
  createInvalidApiKeyError,
  createNotFoundError,
  createRateLimitedError,
  createRpcProviderError,
  createScopeDeniedError,
  createServiceUnavailableError,
  createValidationError,
} from './errors.js';

describe('errors', () => {
  describe('ErrorCode and HttpStatus', () => {
    it('maps all error codes to appropriate HTTP status codes', () => {
      expect(HttpStatus[ErrorCode.VALIDATION_ERROR]).toBe(400);
      expect(HttpStatus[ErrorCode.INVALID_API_KEY]).toBe(401);
      expect(HttpStatus[ErrorCode.SCOPE_DENIED]).toBe(403);
      expect(HttpStatus[ErrorCode.NOT_FOUND]).toBe(404);
      expect(HttpStatus[ErrorCode.IDEMPOTENCY_CONFLICT]).toBe(409);
      expect(HttpStatus[ErrorCode.RATE_LIMITED]).toBe(429);
      expect(HttpStatus[ErrorCode.RPC_PROVIDER_ERROR]).toBe(502);
      expect(HttpStatus[ErrorCode.SERVICE_UNAVAILABLE]).toBe(503);
      expect(HttpStatus[ErrorCode.INTERNAL_ERROR]).toBe(500);
    });
  });

  describe('ChainKitError', () => {
    it('creates error with default status code from mapping', () => {
      const err = new ChainKitError(ErrorCode.NOT_FOUND, 'Project not found');
      expect(err.name).toBe('ChainKitError');
      expect(err.code).toBe(ErrorCode.NOT_FOUND);
      expect(err.statusCode).toBe(404);
      expect(err.message).toBe('Project not found');
    });

    it('creates error with options object', () => {
      const err = new ChainKitError(ErrorCode.VALIDATION_ERROR, 'Invalid fields', {
        statusCode: 422,
        requestId: 'req_123',
        details: [{ field: 'name', message: 'Required' }],
      });
      expect(err.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(err.statusCode).toBe(422);
      expect(err.requestId).toBe('req_123');
      expect(err.details).toEqual([{ field: 'name', message: 'Required' }]);
    });

    it('formats response using toResponse()', () => {
      const err = new ChainKitError(ErrorCode.INVALID_API_KEY, 'Bad token', {
        requestId: 'req_abc',
      });
      const response = err.toResponse();
      expect(response).toEqual({
        error: {
          code: ErrorCode.INVALID_API_KEY,
          message: 'Bad token',
          requestId: 'req_abc',
        },
      });
    });
  });

  describe('createErrorResponse', () => {
    it('formats ChainKitError into ApiErrorResponse', () => {
      const err = new ChainKitError(ErrorCode.RATE_LIMITED, 'Too fast', {
        requestId: 'req_orig',
        details: { retryAfter: 60 },
      });
      const res = createErrorResponse(err, 'req_fallback');
      expect(res).toEqual({
        error: {
          code: ErrorCode.RATE_LIMITED,
          message: 'Too fast',
          requestId: 'req_orig',
          details: { retryAfter: 60 },
        },
      });
    });

    it('formats standard Error into 500 INTERNAL_ERROR response', () => {
      const standardErr = new Error('Database connection failed');
      const res = createErrorResponse(standardErr, 'req_xyz');
      expect(res).toEqual({
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Database connection failed',
          requestId: 'req_xyz',
        },
      });
    });

    it('formats arbitrary string error into 500 INTERNAL_ERROR response', () => {
      const res = createErrorResponse('Crash!', 'req_999');
      expect(res).toEqual({
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Crash!',
          requestId: 'req_999',
        },
      });
    });
  });

  describe('Factory helpers', () => {
    it('createValidationError creates 400 error', () => {
      const err = createValidationError('Invalid payload', { missing: ['type'] }, 'req_1');
      expect(err.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(err.statusCode).toBe(400);
      expect(err.requestId).toBe('req_1');
      expect(err.details).toEqual({ missing: ['type'] });
    });

    it('createInvalidApiKeyError creates 401 error', () => {
      const err = createInvalidApiKeyError();
      expect(err.code).toBe(ErrorCode.INVALID_API_KEY);
      expect(err.statusCode).toBe(401);
    });

    it('createScopeDeniedError creates 403 error', () => {
      const err = createScopeDeniedError();
      expect(err.code).toBe(ErrorCode.SCOPE_DENIED);
      expect(err.statusCode).toBe(403);
    });

    it('createNotFoundError creates 404 error', () => {
      const err = createNotFoundError();
      expect(err.code).toBe(ErrorCode.NOT_FOUND);
      expect(err.statusCode).toBe(404);
    });

    it('createIdempotencyConflictError creates 409 error', () => {
      const err = createIdempotencyConflictError();
      expect(err.code).toBe(ErrorCode.IDEMPOTENCY_CONFLICT);
      expect(err.statusCode).toBe(409);
    });

    it('createRateLimitedError creates 429 error', () => {
      const err = createRateLimitedError();
      expect(err.code).toBe(ErrorCode.RATE_LIMITED);
      expect(err.statusCode).toBe(429);
    });

    it('createRpcProviderError creates 502 error', () => {
      const err = createRpcProviderError();
      expect(err.code).toBe(ErrorCode.RPC_PROVIDER_ERROR);
      expect(err.statusCode).toBe(502);
    });

    it('createServiceUnavailableError creates 503 error', () => {
      const err = createServiceUnavailableError();
      expect(err.code).toBe(ErrorCode.SERVICE_UNAVAILABLE);
      expect(err.statusCode).toBe(503);
    });

    it('createInternalError creates 500 error', () => {
      const err = createInternalError();
      expect(err.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(err.statusCode).toBe(500);
    });
  });
});
