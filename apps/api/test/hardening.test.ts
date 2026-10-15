/**
 * @fileoverview Hardening tests verifying security fixes across the API.
 */

process.env.NODE_ENV = 'test';
process.env.PORT = '3000';
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/chainkit_test';
process.env.API_KEY_PEPPER =
  process.env.API_KEY_PEPPER || 'test-pepper-minimum-16-characters-long';
process.env.RPC_URL = process.env.RPC_URL || 'http://127.0.0.1:8545';
process.env.RECORD_REGISTRY_ADDRESS =
  process.env.RECORD_REGISTRY_ADDRESS || '0x1234567890123456789012345678901234567890';
process.env.RELAYER_PRIVATE_KEY =
  process.env.RELAYER_PRIVATE_KEY ||
  '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { internalError } from '../src/lib/errors.js';

describe('Hardening and Security Checks', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ skipDatabase: true });
    app.decorate('prisma', {
      $queryRaw: async () => [{ '?column?': 1 }],
      $disconnect: async () => {},
      project: {
        findUnique: async () => null,
      },
    } as unknown as FastifyInstance['prisma']);

    // Add a test route that throws an AppError with 500 status and details
    app.get(
      '/v1/test-error-500',
      { config: { isPublic: true } },
      async () => {
        throw internalError('Sensitive internal failure', { dbSecret: 'super-secret-info' });
      }
    );

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('C5: Security Headers (Helmet)', () => {
    it('should include Helmet security headers in responses', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/health',
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['content-security-policy']).toBeDefined();
    });
  });

  describe('L3: Request ID Sanitization', () => {
    it('should accept valid alphanumeric, hyphens, and underscores', async () => {
      const validId = 'Req_trace-12345';
      const response = await app.inject({
        method: 'GET',
        url: '/v1/health',
        headers: { 'x-request-id': validId },
      });

      expect(response.headers['x-request-id']).toBe(validId);
    });

    it('should reject invalid characters in x-request-id and generate a clean UUID', async () => {
      const maliciousId = 'invalid;payload<script>alert(1)</script>';
      const response = await app.inject({
        method: 'GET',
        url: '/v1/health',
        headers: { 'x-request-id': maliciousId },
      });

      const returnedId = response.headers['x-request-id'] as string;
      expect(returnedId).toBeDefined();
      expect(returnedId).not.toBe(maliciousId);
      // Should match standard UUID format
      expect(/^[0-9a-fA-F-]{36}$/.test(returnedId)).toBe(true);
    });

    it('should reject overly long x-request-id (> 128 chars) and generate a new one', async () => {
      const overlyLongId = 'a'.repeat(129);
      const response = await app.inject({
        method: 'GET',
        url: '/v1/health',
        headers: { 'x-request-id': overlyLongId },
      });

      const returnedId = response.headers['x-request-id'] as string;
      expect(returnedId).not.toBe(overlyLongId);
    });
  });

  describe('M5: Sanitize 5xx Error Details', () => {
    it('should not leak error.details in 500 error responses', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/test-error-500',
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INTERNAL_SERVER_ERROR');
      expect(body.error.message).toBe('Sensitive internal failure');
      expect(body.error.details).toBeUndefined();
    });
  });

  describe('H5: Project Access Authorization Bypass Fix', () => {
    it('should deny project access when request is unauthenticated or projectId is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/projects/proj-123',
      });

      // Without matching projectId, the authorization check denies access with 403 Forbidden
      expect(response.statusCode).toBe(403);
    });
  });
});
