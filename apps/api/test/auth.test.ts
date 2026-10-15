/**
 * @fileoverview Unit and integration tests for Email OTP authentication and session management.
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
import { sha256Hex } from '../src/lib/crypto.js';

describe('Email OTP Authentication System', () => {
  let app: FastifyInstance;

  // In-memory test state for mock prisma
  const otps: any[] = [];
  const users: any[] = [];
  const projects: any[] = [];
  const sessions: any[] = [];

  beforeAll(async () => {
    app = await buildApp({ skipDatabase: true });

    // Mock Prisma with full auth models
    const mockPrisma = {
      $disconnect: async () => {},
      emailOtp: {
        create: async ({ data }: any) => {
          const rec = { id: `otp_${Date.now()}`, ...data };
          otps.push(rec);
          return rec;
        },
        findFirst: async ({ where }: any) => {
          return (
            otps
              .filter(
                (o) =>
                  o.email === where.email &&
                  o.used === where.used &&
                  (!where.expiresAt?.gt || o.expiresAt > where.expiresAt.gt)
              )
              .sort((a, b) => b.createdAt - a.createdAt)[0] || null
          );
        },
        update: async ({ where, data }: any) => {
          const item = otps.find((o) => o.id === where.id);
          if (item) Object.assign(item, data);
          return item;
        },
        updateMany: async ({ where, data }: any) => {
          let count = 0;
          for (const item of otps) {
            if (item.email === where.email && item.used === where.used) {
              Object.assign(item, data);
              count++;
            }
          }
          return { count };
        },
      },
      user: {
        findUnique: async ({ where }: any) => {
          const u = users.find((user) => (where.email ? user.email === where.email : user.id === where.id));
          if (!u) return null;
          return {
            ...u,
            projects: projects.filter((p) => p.userId === u.id),
          };
        },
        create: async ({ data }: any) => {
          const u = { id: `usr_${Date.now()}`, ...data, createdAt: new Date() };
          users.push(u);
          return { ...u, projects: [] };
        },
      },
      project: {
        create: async ({ data }: any) => {
          const proj = { id: `proj_${Date.now()}`, ...data, apiKeys: [{ id: 'key_1', prefix: 'ck_sandbox_123' }] };
          projects.push(proj);
          return proj;
        },
      },
      session: {
        create: async ({ data }: any) => {
          const sess = { id: `sess_${Date.now()}`, ...data };
          sessions.push(sess);
          return sess;
        },
        findUnique: async ({ where }: any) => {
          const sess = sessions.find((s) => s.tokenHash === where.tokenHash);
          if (!sess) return null;
          const u = users.find((user) => user.id === sess.userId);
          return {
            ...sess,
            user: {
              ...u,
              projects: projects.filter((p) => p.userId === u.id),
            },
          };
        },
        deleteMany: async ({ where }: any) => {
          const idx = sessions.findIndex((s) => s.tokenHash === where.tokenHash);
          if (idx !== -1) sessions.splice(idx, 1);
          return { count: 1 };
        },
      },
    };

    app.decorate('prisma', mockPrisma as unknown as FastifyInstance['prisma']);
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /v1/auth/otp/send - rejects invalid email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/otp/send',
      payload: { email: 'not-an-email' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('POST /v1/auth/otp/send - generates and logs 6-digit OTP code', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/otp/send',
      payload: { email: 'developer@example.com' },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(true);
    expect(body.expiresInSeconds).toBe(600);
    expect(body.debugCode).toBeDefined();
    expect(body.debugCode).toMatch(/^\d{6}$/);
  });

  it('POST /v1/auth/otp/verify - rejects wrong 6-digit code', async () => {
    // Send OTP first
    await app.inject({
      method: 'POST',
      url: '/v1/auth/otp/send',
      payload: { email: 'developer@example.com' },
    });

    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/otp/verify',
      payload: {
        email: 'developer@example.com',
        code: '000000',
      },
    });

    expect(res.statusCode).toBe(400);
    const body = JSON.parse(res.body);
    const msg = body.error?.message || body.message || '';
    expect(msg).toContain('Invalid verification code');
  });

  it('POST /v1/auth/otp/verify - verifies code and provisions user session', async () => {
    // Send fresh OTP
    const sendRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/otp/send',
      payload: { email: 'alice@example.com' },
    });
    const { debugCode } = JSON.parse(sendRes.body);

    // Verify OTP
    const verifyRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/otp/verify',
      payload: {
        email: 'alice@example.com',
        code: debugCode,
      },
    });

    expect(verifyRes.statusCode).toBe(200);
    const body = JSON.parse(verifyRes.body);
    expect(body.success).toBe(true);
    expect(body.token).toMatch(/^cksess_[a-f0-9]{64}$/);
    expect(body.user.email).toBe('alice@example.com');
    expect(body.projects.length).toBeGreaterThanOrEqual(1);

    // Test GET /auth/me with the issued session token
    const meRes = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: {
        authorization: `Bearer ${body.token}`,
      },
    });

    if (meRes.statusCode !== 200) {
      console.log('meRes error:', meRes.body);
    }

    expect(meRes.statusCode).toBe(200);
    const meBody = JSON.parse(meRes.body);
    expect(meBody.authenticated).toBe(true);
    expect(meBody.user.email).toBe('alice@example.com');

    // Test POST /auth/logout
    const logoutRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/logout',
      headers: {
        authorization: `Bearer ${body.token}`,
      },
    });

    expect(logoutRes.statusCode).toBe(200);
  });
});
