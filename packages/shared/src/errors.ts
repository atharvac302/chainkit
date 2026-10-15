/**
 * @fileoverview Error codes, HTTP status mappings, error classes, and formatting helpers.
 * Defines standard error handling semantics across the ChainKit platform.
 *
 * @module @chainkit/shared/errors
 */

import type { ApiErrorResponse } from './types.js';

/**
 * Standard error codes representing domain and operational errors.
 */
export enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_API_KEY = 'INVALID_API_KEY',
  SCOPE_DENIED = 'SCOPE_DENIED',
  NOT_FOUND = 'NOT_FOUND',
  IDEMPOTENCY_CONFLICT = 'IDEMPOTENCY_CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  RPC_PROVIDER_ERROR = 'RPC_PROVIDER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
}

/**
 * Default HTTP status code mappings for each standard ErrorCode.
 */
export const HttpStatus: Record<ErrorCode, number> = {
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_API_KEY]: 401,
  [ErrorCode.SCOPE_DENIED]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.IDEMPOTENCY_CONFLICT]: 409,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.RPC_PROVIDER_ERROR]: 502,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.INTERNAL_ERROR]: 500,
} as const;

/**
 * Options accepted by the ChainKitError constructor.
 */
export interface ChainKitErrorOptions {
  /** Explicit HTTP status code override. */
  statusCode?: number;
  /** Request correlation ID. */
  requestId?: string;
  /** Supplementary structured details (e.g. field errors, upstream logs). */
  details?: unknown;
  /** Underlying cause of the error. */
  cause?: unknown;
}

/**
 * Custom application error class for the ChainKit platform.
 * Carries machine-readable error codes, HTTP status, and correlation metadata.
 */
export class ChainKitError extends Error {
  /** Machine-readable error code. */
  public readonly code: ErrorCode;
  /** HTTP response status code. */
  public readonly statusCode: number;
  /** Unique request correlation ID, if known. */
  public readonly requestId?: string;
  /** Supplementary context or structured validation errors. */
  public readonly details?: unknown;

  /**
   * Constructs a new ChainKitError.
   *
   * @param code - Standard error code enum.
   * @param message - Human-readable diagnostic message.
   * @param optionsOrStatusCode - Optional config options or numeric status code override.
   * @param requestId - Optional request ID if third param was a status code.
   * @param details - Optional details if third param was a status code.
   */
  constructor(
    code: ErrorCode,
    message: string,
    optionsOrStatusCode?: number | ChainKitErrorOptions,
    requestId?: string,
    details?: unknown
  ) {
    super(message);
    this.name = 'ChainKitError';
    this.code = code;

    if (typeof optionsOrStatusCode === 'number') {
      this.statusCode = optionsOrStatusCode;
      this.requestId = requestId;
      this.details = details;
    } else if (optionsOrStatusCode) {
      this.statusCode = optionsOrStatusCode.statusCode ?? HttpStatus[code] ?? 500;
      this.requestId = optionsOrStatusCode.requestId ?? requestId;
      this.details = optionsOrStatusCode.details ?? details;
      if (optionsOrStatusCode.cause !== undefined) {
        this.cause = optionsOrStatusCode.cause;
      }
    } else {
      this.statusCode = HttpStatus[code] ?? 500;
      this.requestId = requestId;
      this.details = details;
    }

    Object.setPrototypeOf(this, ChainKitError.prototype);
  }

  /**
   * Serializes the error instance to a standard ApiErrorResponse object.
   *
   * @param fallbackRequestId - Optional request ID to use if not set on the error instance.
   * @returns Formatted ApiErrorResponse.
   */
  public toResponse(fallbackRequestId = 'unknown'): ApiErrorResponse {
    return createErrorResponse(this, this.requestId ?? fallbackRequestId);
  }
}

/**
 * Formats an unknown error or ChainKitError into a standard ApiErrorResponse.
 *
 * @param error - The thrown error or error object.
 * @param requestId - Request tracking correlation ID.
 * @returns Standard API error response payload.
 */
export function createErrorResponse(
  error: unknown,
  requestId: string
): ApiErrorResponse {
  if (error instanceof ChainKitError) {
    return {
      error: {
        code: error.code,
        message: error.message,
        requestId: error.requestId ?? requestId,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
    };
  }

  if (error instanceof Error) {
    return {
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: error.message || 'An unexpected internal error occurred',
        requestId,
      },
    };
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const errorObj = error as { code?: unknown; message: unknown; details?: unknown };
    const code = typeof errorObj.code === 'string' && errorObj.code in HttpStatus
      ? (errorObj.code as ErrorCode)
      : ErrorCode.INTERNAL_ERROR;
    const message = typeof errorObj.message === 'string'
      ? errorObj.message
      : 'An unexpected internal error occurred';

    return {
      error: {
        code,
        message,
        requestId,
        ...(errorObj.details !== undefined ? { details: errorObj.details } : {}),
      },
    };
  }

  return {
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: typeof error === 'string' ? error : 'An unexpected internal error occurred',
      requestId,
    },
  };
}

/**
 * Factory creating a 400 VALIDATION_ERROR.
 */
export function createValidationError(
  message = 'Request validation failed',
  details?: unknown,
  requestId?: string
): ChainKitError {
  return new ChainKitError(ErrorCode.VALIDATION_ERROR, message, { details, requestId });
}

/**
 * Factory creating a 401 INVALID_API_KEY error.
 */
export function createInvalidApiKeyError(
  message = 'Invalid or missing API key',
  details?: unknown,
  requestId?: string
): ChainKitError {
  return new ChainKitError(ErrorCode.INVALID_API_KEY, message, { details, requestId });
}

/**
 * Factory creating a 403 SCOPE_DENIED error.
 */
export function createScopeDeniedError(
  message = 'Access denied: insufficient permissions',
  details?: unknown,
  requestId?: string
): ChainKitError {
  return new ChainKitError(ErrorCode.SCOPE_DENIED, message, { details, requestId });
}

/**
 * Factory creating a 404 NOT_FOUND error.
 */
export function createNotFoundError(
  message = 'Requested resource not found',
  details?: unknown,
  requestId?: string
): ChainKitError {
  return new ChainKitError(ErrorCode.NOT_FOUND, message, { details, requestId });
}

/**
 * Factory creating a 409 IDEMPOTENCY_CONFLICT error.
 */
export function createIdempotencyConflictError(
  message = 'Concurrent or conflicting request with the same idempotency key',
  details?: unknown,
  requestId?: string
): ChainKitError {
  return new ChainKitError(ErrorCode.IDEMPOTENCY_CONFLICT, message, { details, requestId });
}

/**
 * Factory creating a 429 RATE_LIMITED error.
 */
export function createRateLimitedError(
  message = 'Rate limit exceeded. Please slow down requests.',
  details?: unknown,
  requestId?: string
): ChainKitError {
  return new ChainKitError(ErrorCode.RATE_LIMITED, message, { details, requestId });
}

/**
 * Factory creating a 502 RPC_PROVIDER_ERROR error.
 */
export function createRpcProviderError(
  message = 'Blockchain RPC node communication failure',
  details?: unknown,
  requestId?: string
): ChainKitError {
  return new ChainKitError(ErrorCode.RPC_PROVIDER_ERROR, message, { details, requestId });
}

/**
 * Factory creating a 503 SERVICE_UNAVAILABLE error.
 */
export function createServiceUnavailableError(
  message = 'Service temporarily unavailable',
  details?: unknown,
  requestId?: string
): ChainKitError {
  return new ChainKitError(ErrorCode.SERVICE_UNAVAILABLE, message, { details, requestId });
}

/**
 * Factory creating a 500 INTERNAL_ERROR error.
 */
export function createInternalError(
  message = 'An unexpected internal error occurred',
  details?: unknown,
  requestId?: string
): ChainKitError {
  return new ChainKitError(ErrorCode.INTERNAL_ERROR, message, { details, requestId });
}
