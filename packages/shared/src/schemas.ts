/**
 * @fileoverview Zod validation schemas for ChainKit request payloads and query parameters.
 * Enforces strict typing, string length constraints, and cryptographic hash formats.
 *
 * @module @chainkit/shared/schemas
 */

import { z } from 'zod';

/**
 * Regular expression validating a 32-byte hexadecimal hash (64 hex characters),
 * optionally prefixed with '0x' or '0X'.
 */
const HEX_HASH_REGEX = /^(?:0x)?[a-fA-F0-9]{64}$/;

/**
 * Schema validating 32-byte hexadecimal content hashes.
 */
export const hexHashSchema = z
  .string()
  .trim()
  .regex(HEX_HASH_REGEX, 'contentHash must be a 32-byte hex string (64 hex characters, optional 0x prefix)');

/**
 * Schema validating input for creating a new immutable record.
 * Validates type (1-80 chars), externalId (1-160 chars, optional), content (object, optional),
 * and contentHash (hex string, optional).
 * Refined to require that either content or contentHash is supplied.
 */
export const createRecordSchema = z
  .object({
    type: z
      .string()
      .trim()
      .min(1, 'Record type is required and cannot be empty')
      .max(80, 'Record type cannot exceed 80 characters'),
    externalId: z
      .string()
      .trim()
      .min(1, 'externalId cannot be empty')
      .max(160, 'externalId cannot exceed 160 characters')
      .optional(),
    content: z
      .record(z.string(), z.unknown())
      .optional(),
    contentHash: hexHashSchema.optional(),
  })
  .refine(
    (data) => data.content !== undefined || (data.contentHash !== undefined && data.contentHash.length > 0),
    {
      message: 'Either content or contentHash must be provided',
      path: ['content'],
    }
  );

/**
 * Schema validating input for verifying an existing record.
 * Validates content (object, optional) and contentHash (hex string, optional).
 * Refined to require that either content or contentHash is supplied.
 */
export const verifyRecordSchema = z
  .object({
    content: z
      .record(z.string(), z.unknown())
      .optional(),
    contentHash: hexHashSchema.optional(),
  })
  .refine(
    (data) => data.content !== undefined || (data.contentHash !== undefined && data.contentHash.length > 0),
    {
      message: 'Either content or contentHash must be provided',
      path: ['content'],
    }
  );

/**
 * Schema validating input for provisioning a new tenant API key.
 * Validates optional key name and environment ('sandbox' | 'production').
 */
export const createApiKeySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'API key name cannot be empty')
    .max(100, 'API key name cannot exceed 100 characters')
    .optional(),
  environment: z
    .enum(['sandbox', 'production'], {
      errorMap: () => ({ message: "Environment must be either 'sandbox' or 'production'" }),
    })
    .default('sandbox'),
});

/**
 * Schema validating input for creating a new project.
 * Validates project name (1-100 characters).
 */
export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Project name is required and cannot be empty')
    .max(100, 'Project name cannot exceed 100 characters'),
});

/**
 * Schema validating pagination query parameters with sensible defaults.
 * Accepts numeric values or strings coerced to numbers.
 */
export const paginationSchema = z.object({
  page: z
    .coerce
    .number()
    .int('Page must be an integer')
    .min(1, 'Page must be at least 1')
    .default(1),
  limit: z
    .coerce
    .number()
    .int('Limit must be an integer')
    .min(1, 'Limit must be at least 1')
    .max(100, 'Limit cannot exceed 100')
    .default(20),
});

/** Inferred type for createRecordSchema input. */
export type CreateRecordSchemaInput = z.infer<typeof createRecordSchema>;

/** Inferred type for verifyRecordSchema input. */
export type VerifyRecordSchemaInput = z.infer<typeof verifyRecordSchema>;

/** Inferred type for createApiKeySchema input. */
export type CreateApiKeySchemaInput = z.infer<typeof createApiKeySchema>;

/** Inferred type for createProjectSchema input. */
export type CreateProjectSchemaInput = z.infer<typeof createProjectSchema>;

/** Inferred type for paginationSchema input. */
export type PaginationSchemaInput = z.infer<typeof paginationSchema>;
