/**
 * ChainKit TypeScript SDK - Error Classes and Response Error Factory
 *
 * Provides strongly-typed error hierarchies representing HTTP and API failures
 * returned by the ChainKit API platform.
 *
 * @module @chainkit/sdk/errors
 */

import type { ChainKitErrorResponse } from './types.js';

/**
 * Base error class for all ChainKit SDK errors.
 */
export class ChainKitError extends Error {
  /**
   * Machine-readable error code (e.g. 'VALIDATION_ERROR', 'RECORD_NOT_FOUND').
   */
  public readonly code: string;

  /**
   * HTTP status code associated with the error.
   */
  public readonly statusCode: number;

  /**
   * Unique request ID assigned by the server for distributed tracing and support.
   */
  public readonly requestId?: string;

  /**
   * Construct a new ChainKitError.
   *
   * @param message - Human-readable error message.
   * @param code - Machine-readable error code.
   * @param statusCode - HTTP status code.
   * @param requestId - Optional request identifier.
   */
  constructor(message: string, code: string, statusCode: number, requestId?: string) {
    super(message);
    this.name = 'ChainKitError';
    this.code = code;
    this.statusCode = statusCode;
    this.requestId = requestId;

    // Restore prototype chain for ES5/ES6 inheritance
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when client-provided inputs fail schema validation (HTTP 400).
 */
export class ValidationError extends ChainKitError {
  constructor(
    message: string = 'Validation error: invalid request payload or parameters',
    code: string = 'VALIDATION_ERROR',
    requestId?: string
  ) {
    super(message, code, 400, requestId);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Thrown when API key authentication or authorization fails (HTTP 401 or 403).
 */
export class AuthenticationError extends ChainKitError {
  constructor(
    message: string = 'Authentication failed: invalid, missing, or unauthorized API key',
    code: string = 'AUTHENTICATION_ERROR',
    statusCode: number = 401,
    requestId?: string
  ) {
    super(message, code, statusCode, requestId);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Thrown when a caller lacks permission to access the requested resource (HTTP 403).
 * Extends AuthenticationError for backward-compatible error handling.
 */
export class ForbiddenError extends AuthenticationError {
  constructor(
    message: string = 'Access denied: insufficient permissions for this resource',
    code: string = 'FORBIDDEN',
    requestId?: string
  ) {
    super(message, code, 403, requestId);
    this.name = 'ForbiddenError';
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/**
 * Thrown when the requested resource (record or transaction) is not found (HTTP 404).
 */
export class NotFoundError extends ChainKitError {
  constructor(
    message: string = 'The requested resource was not found',
    code: string = 'NOT_FOUND',
    requestId?: string
  ) {
    super(message, code, 404, requestId);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/**
 * Thrown when a conflict occurs, such as duplicate idempotency key or hash (HTTP 409).
 */
export class ConflictError extends ChainKitError {
  constructor(
    message: string = 'Resource conflict: a record with the same key or hash already exists',
    code: string = 'CONFLICT',
    requestId?: string
  ) {
    super(message, code, 409, requestId);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/**
 * Thrown when API rate limits have been exceeded (HTTP 429).
 */
export class RateLimitError extends ChainKitError {
  /**
   * Number of seconds to wait before retrying, if provided by the Retry-After header.
   */
  public readonly retryAfter?: number;

  constructor(
    message: string = 'Rate limit exceeded: too many requests in this time window',
    code: string = 'RATE_LIMIT_EXCEEDED',
    retryAfter?: number,
    requestId?: string
  ) {
    super(message, code, 429, requestId);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Thrown when the ChainKit server or an upstream service encounters an internal failure (HTTP 5xx).
 */
export class ServerError extends ChainKitError {
  constructor(
    message: string = 'An unexpected server error occurred on ChainKit platform',
    code: string = 'SERVER_ERROR',
    statusCode: number = 500,
    requestId?: string
  ) {
    super(message, code, statusCode, requestId);
    this.name = 'ServerError';
    Object.setPrototypeOf(this, ServerError.prototype);
  }
}

/**
 * Helper to check whether an object matches the ChainKitErrorResponse interface.
 */
function isErrorResponse(data: unknown): data is ChainKitErrorResponse {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  const obj = data as Record<string, unknown>;
  return (
    typeof obj['error'] === 'object' &&
    obj['error'] !== null &&
    typeof (obj['error'] as Record<string, unknown>)['message'] === 'string'
  );
}

/**
 * Factory function that inspects an HTTP status code and response body to instantiate
 * the appropriate typed ChainKitError subclass.
 *
 * @param status - HTTP response status code.
 * @param body - Parsed response payload or raw error data.
 * @param headerRequestId - Optional request ID extracted from response headers.
 * @returns An instance of ChainKitError or one of its specialized subclasses.
 */
export function createErrorFromResponse(
  status: number,
  body: unknown,
  headerRequestId?: string
): ChainKitError {
  let message = `Request failed with status code ${status}`;
  let code = `HTTP_${status}`;
  let requestId = headerRequestId;

  if (isErrorResponse(body)) {
    message = body.error.message || message;
    code = body.error.code || code;
    requestId = body.error.requestId || requestId;
  } else if (typeof body === 'object' && body !== null) {
    const obj = body as Record<string, unknown>;
    if (typeof obj['message'] === 'string' && obj['message'].length > 0) {
      message = obj['message'];
    }
    if (typeof obj['code'] === 'string' && obj['code'].length > 0) {
      code = obj['code'];
    }
    if (typeof obj['requestId'] === 'string' && obj['requestId'].length > 0) {
      requestId = obj['requestId'];
    }
  } else if (typeof body === 'string' && body.trim().length > 0) {
    message = body.trim();
  }

  switch (status) {
    case 400:
      return new ValidationError(message, code === `HTTP_${status}` ? 'VALIDATION_ERROR' : code, requestId);
    case 401:
      return new AuthenticationError(message, code === `HTTP_${status}` ? 'AUTHENTICATION_ERROR' : code, 401, requestId);
    case 403:
      return new ForbiddenError(message, code === `HTTP_${status}` ? 'FORBIDDEN' : code, requestId);
    case 404:
      return new NotFoundError(message, code === `HTTP_${status}` ? 'NOT_FOUND' : code, requestId);
    case 409:
      return new ConflictError(message, code === `HTTP_${status}` ? 'CONFLICT' : code, requestId);
    case 429:
      return new RateLimitError(message, code === `HTTP_${status}` ? 'RATE_LIMIT_EXCEEDED' : code, undefined, requestId);
    default:
      if (status >= 500) {
        return new ServerError(message, code === `HTTP_${status}` ? 'SERVER_ERROR' : code, status, requestId);
      }
      return new ChainKitError(message, code, status, requestId);
  }
}
