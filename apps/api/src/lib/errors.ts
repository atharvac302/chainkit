/**
 * @fileoverview Centralized error handling for the Fastify API.
 * Provides custom AppError class, factory helpers, and a global Fastify error handler.
 */

import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

/**
 * Standard application error with HTTP status, machine-readable code, and optional details.
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: unknown;
  public readonly isOperational: boolean;

  /**
   * Creates an instance of AppError.
   *
   * @param code - Machine-readable error code (e.g., 'NOT_FOUND').
   * @param statusCode - HTTP status code (e.g., 404).
   * @param message - Human-readable error message.
   * @param details - Optional supplementary error details.
   * @param isOperational - Indicates if the error is known/operational (default true).
   */
  constructor(
    code: string,
    statusCode: number,
    message: string,
    details?: unknown,
    isOperational = true
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Factory for 400 Bad Request / Validation errors.
 */
export function validationError(
  message = 'Request validation failed',
  details?: unknown
): AppError {
  return new AppError('VALIDATION_ERROR', 400, message, details);
}

/**
 * Factory for 401 Unauthorized errors.
 */
export function unauthorizedError(
  message = 'Authentication required or invalid credentials',
  details?: unknown
): AppError {
  return new AppError('UNAUTHORIZED', 401, message, details);
}

/**
 * Factory for 403 Forbidden errors.
 */
export function forbiddenError(
  message = 'Access forbidden for current credentials',
  details?: unknown
): AppError {
  return new AppError('FORBIDDEN', 403, message, details);
}

/**
 * Factory for 404 Not Found errors.
 */
export function notFoundError(
  message = 'The requested resource was not found',
  details?: unknown
): AppError {
  return new AppError('NOT_FOUND', 404, message, details);
}

/**
 * Factory for 409 Conflict errors.
 */
export function conflictError(
  message = 'Resource state conflict occurred',
  details?: unknown
): AppError {
  return new AppError('CONFLICT', 409, message, details);
}

/**
 * Factory for 429 Rate Limit Exceeded errors.
 */
export function rateLimitError(
  message = 'Rate limit exceeded. Please try again later.',
  details?: unknown
): AppError {
  return new AppError('RATE_LIMIT_EXCEEDED', 429, message, details);
}

/**
 * Factory for 500 Internal Server errors.
 */
export function internalError(
  message = 'An unexpected internal error occurred',
  details?: unknown
): AppError {
  return new AppError('INTERNAL_SERVER_ERROR', 500, message, details, false);
}

/**
 * Global Fastify error handler.
 * Serializes AppErrors, ZodErrors, and unexpected errors to a standard format.
 */
export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  const requestId = request.requestId ?? 'unknown';

  // Handle custom AppError
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      request.log.error({ err: error, requestId }, error.message);
    } else {
      request.log.warn({ err: error, requestId }, error.message);
    }

    reply.status(error.statusCode).send({
      error: {
        code: error.code,
        message: error.message,
        details: error.details,
        requestId,
      },
    });
    return;
  }

  // Handle Zod schema validation errors
  if (error instanceof ZodError) {
    request.log.warn({ issues: error.issues, requestId }, 'Zod validation error');
    reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
        details: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
        requestId,
      },
    });
    return;
  }

  // Handle Fastify built-in schema validation errors
  const fastifyErr = error as FastifyError;
  if (fastifyErr.validation) {
    request.log.warn({ validation: fastifyErr.validation, requestId }, 'Fastify schema validation error');
    reply.status(400).send({
      error: {
        code: 'VALIDATION_ERROR',
        message: fastifyErr.message,
        details: fastifyErr.validation,
        requestId,
      },
    });
    return;
  }

  // Handle 429 Rate limit from plugins
  if (fastifyErr.statusCode === 429) {
    request.log.warn({ requestId }, 'Rate limit exceeded');
    reply.status(429).send({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: fastifyErr.message || 'Rate limit exceeded',
        requestId,
      },
    });
    return;
  }

  // Unhandled / unexpected internal error
  request.log.error(
    {
      err: error,
      requestId,
      url: request.url,
      method: request.method,
    },
    'Unhandled server error'
  );

  reply.status(500).send({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred',
      requestId,
    },
  });
}
