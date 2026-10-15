/**
 * @fileoverview Environment configuration loader with Zod validation.
 * Ensures all required environment variables are present and typed at boot.
 */

import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
dotenv.config();

const INSECURE_PLACEHOLDER_PEPPERS = [
  'chainkit-default-development-pepper-minimum-16-chars',
  'test-pepper-minimum-16-characters-long',
];

const INSECURE_PLACEHOLDER_ADDRESSES = [
  '0x1234567890123456789012345678901234567890',
];

const INSECURE_PLACEHOLDER_PRIVATE_KEYS = [
  '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
];

/**
 * Zod schema defining all required and optional environment variables.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z
      .string()
      .default('3000')
      .transform((val) => {
        const parsed = parseInt(val, 10);
        if (isNaN(parsed)) {
          throw new Error(`Invalid PORT value: ${val}`);
        }
        return parsed;
      }),
    DATABASE_URL: z
      .string()
      .min(1, 'DATABASE_URL is required')
      .default('postgresql://postgres:postgres@localhost:5432/chainkit'),
    API_KEY_PEPPER: z
      .string()
      .min(16, 'API_KEY_PEPPER must be at least 16 characters for cryptographic security'),
    RPC_URL: z.string().url('RPC_URL must be a valid URL').default('http://127.0.0.1:8545'),
    CHAIN_ID: z
      .string()
      .default('31337')
      .transform((val) => {
        const parsed = parseInt(val, 10);
        if (isNaN(parsed)) {
          throw new Error(`Invalid CHAIN_ID value: ${val}`);
        }
        return parsed;
      }),
    RECORD_REGISTRY_ADDRESS: z
      .string()
      .regex(/^0x[a-fA-F0-9]{40}$/, 'RECORD_REGISTRY_ADDRESS must be a valid 20-byte 0x-prefixed hex string')
      .transform((val) => val as `0x${string}`),
    RELAYER_PRIVATE_KEY: z
      .string()
      .regex(/^0x[a-fA-F0-9]{64}$/, 'RELAYER_PRIVATE_KEY must be a valid 32-byte 0x-prefixed hex string')
      .transform((val) => val as `0x${string}`),
    ALLOWED_ORIGINS: z
      .string()
      .default('*')
      .transform((val) => {
        if (val === '*') return ['*'];
        return val.split(',').map((origin) => origin.trim()).filter(Boolean);
      }),
    ADMIN_TOKEN: z.string().min(16, 'ADMIN_TOKEN must be at least 16 characters').optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (
        !data.API_KEY_PEPPER ||
        data.API_KEY_PEPPER.length < 32 ||
        INSECURE_PLACEHOLDER_PEPPERS.includes(data.API_KEY_PEPPER)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'API_KEY_PEPPER must be explicitly set with at least 32 characters in production (cannot be empty or placeholder)',
          path: ['API_KEY_PEPPER'],
        });
      }

      if (
        !data.RELAYER_PRIVATE_KEY ||
        INSECURE_PLACEHOLDER_PRIVATE_KEYS.includes(data.RELAYER_PRIVATE_KEY.toLowerCase())
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'RELAYER_PRIVATE_KEY must be explicitly set in production (cannot be empty or placeholder)',
          path: ['RELAYER_PRIVATE_KEY'],
        });
      }

      if (
        !data.RECORD_REGISTRY_ADDRESS ||
        INSECURE_PLACEHOLDER_ADDRESSES.includes(data.RECORD_REGISTRY_ADDRESS.toLowerCase())
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            'RECORD_REGISTRY_ADDRESS must be explicitly set in production (cannot be empty or placeholder)',
          path: ['RECORD_REGISTRY_ADDRESS'],
        });
      }

      if (data.ALLOWED_ORIGINS.includes('*')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'ALLOWED_ORIGINS must not include wildcard (*) in production',
          path: ['ALLOWED_ORIGINS'],
        });
      }
    }
  });

/**
 * Parsed and validated environment configuration.
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Validate process.env against schema and fail fast if invalid.
 */
function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error('CRITICAL: Environment validation failed:\n' + issues);
    throw new Error(`Environment validation failed:\n${issues}`);
  }

  return result.data;
}

export const env: Env = loadEnv();
