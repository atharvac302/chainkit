/**
 * @fileoverview Unit and integration tests for API health checks and readiness probes.
 */

// Configure default test environment variables before module imports
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

describe('Health and System Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Build app with mock/skipped database connection to isolate unit test
    app = await buildApp({ skipDatabase: true });
    // Decorate mock prisma for readiness check test
    app.decorate('prisma', {
      $queryRaw: async () => [{ '?column?': 1 }],
      $disconnect: async () => {},
    } as unknown as FastifyInstance['prisma']);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /v1/health (Liveness)', () => {
    it('should return 200 OK with service identifier and timestamp', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);

      expect(body.status).toBe('ok');
      expect(body.service).toBe('chainkit-api');
      expect(typeof body.timestamp).toBe('string');
      expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
    });

    it('should include x-request-id in response headers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/health',
      });

      expect(response.headers['x-request-id']).toBeDefined();
      expect(typeof response.headers['x-request-id']).toBe('string');
    });

    it('should echo custom client x-request-id header', async () => {
      const customId = 'req-custom-trace-12345';
      const response = await app.inject({
        method: 'GET',
        url: '/v1/health',
        headers: {
          'x-request-id': customId,
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['x-request-id']).toBe(customId);
    });

    it('should support root /health alias without prefix', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ok');
    });
  });

  describe('GET /v1/health/ready (Readiness)', () => {
    it('should return 200 Ready when database is connected', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/health/ready',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('ready');
      expect(body.database).toBe('connected');
    });

    it('should return 503 Unavailable when database query fails', async () => {
      // Temporarily mock failure
      const originalQuery = app.prisma.$queryRaw;
      app.prisma.$queryRaw = (async () => {
        throw new Error('Connection refused to PostgreSQL');
      }) as unknown as typeof originalQuery;

      const response = await app.inject({
        method: 'GET',
        url: '/v1/health/ready',
      });

      expect(response.statusCode).toBe(503);
      const body = JSON.parse(response.body);
      expect(body.status).toBe('unavailable');
      expect(body.database).toBe('disconnected');

      // Restore mock
      app.prisma.$queryRaw = originalQuery;
    });
  });

  describe('404 Route Handling', () => {
    it('should return standardized JSON error format for unknown routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/v1/unknown-endpoint',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe('NOT_FOUND');
      expect(body.error.message).toContain('/v1/unknown-endpoint');
      expect(body.error.requestId).toBeDefined();
    });
  });
});
