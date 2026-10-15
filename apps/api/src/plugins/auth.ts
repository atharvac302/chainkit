/**
 * @fileoverview Fastify API key authentication plugin.
 * Validates bearer API keys, verifies cryptographic hashes against PostgreSQL,
 * and establishes tenant project context.
 */

import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';
import { unauthorizedError } from '../lib/errors.js';
import { verifyApiKeySecret } from '../lib/crypto.js';

const lastUsedCache = new Map<string, number>();
const LAST_USED_DEBOUNCE_MS = 3600_000; // 1 hour

declare module 'fastify' {
  interface FastifyContextConfig {
    isPublic?: boolean;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/**
 * Extracts raw API key from Authorization header or X-API-Key header.
 * Redacts any sensitive data if errors occur.
 *
 * @param request - Incoming Fastify request.
 * @returns Raw API key string or null if not provided.
 */
function extractApiKey(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7).trim();
    }
    if (authHeader.startsWith('ck_')) {
      return authHeader.trim();
    }
  }

  const apiKeyHeader = request.headers['x-api-key'];
  if (typeof apiKeyHeader === 'string' && apiKeyHeader.trim().length > 0) {
    return apiKeyHeader.trim();
  }

  return null;
}

/**
 * Parses the public prefix and secret portion from a full API key.
 *
 * @param fullKey - e.g., 'ck_test_a1b2c3d4_s3cr3t...'
 * @returns Parsed prefix and secret, or null if key does not match pattern.
 */
function parseApiKey(fullKey: string): { prefix: string; secret: string } | null {
  const parts = fullKey.split('_');
  // Format: ck_<env>_<prefixId>_<secret>
  if (parts.length < 4 || parts[0] !== 'ck') {
    return null;
  }

  const prefix = `${parts[0]}_${parts[1]}_${parts[2]}`;
  const secret = parts.slice(3).join('_');

  if (!prefix || !secret) {
    return null;
  }

  return { prefix, secret };
}

/**
 * Core authentication logic verifying an API key against the database.
 */
export async function authenticateApiKey(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const rawKey = extractApiKey(request);
  if (!rawKey) {
    throw unauthorizedError('Missing API key. Please provide Bearer token in Authorization header.');
  }

  const parsed = parseApiKey(rawKey);
  if (!parsed) {
    throw unauthorizedError('Malformed API key format.');
  }

  const apiKeyRecord = await request.server.prisma.apiKey.findFirst({
    where: {
      prefix: parsed.prefix,
    },
  });

  if (!apiKeyRecord) {
    throw unauthorizedError('Invalid API key.');
  }

  if (apiKeyRecord.status !== 'active') {
    throw unauthorizedError('API key is inactive or has been revoked.');
  }

  const isValidSecret = verifyApiKeySecret(
    parsed.secret,
    apiKeyRecord.secretHash,
    env.API_KEY_PEPPER
  );

  if (!isValidSecret) {
    throw unauthorizedError('Invalid API key.');
  }

  // Populate request context
  request.projectId = apiKeyRecord.projectId;
  request.environment = apiKeyRecord.environment;
  request.apiKeyId = apiKeyRecord.id;

  // Asynchronously record last used timestamp with 1-hour debounce
  const now = Date.now();
  const lastUpdated = lastUsedCache.get(apiKeyRecord.id) ?? 0;
  if (now - lastUpdated > LAST_USED_DEBOUNCE_MS) {
    lastUsedCache.set(apiKeyRecord.id, now);
    request.server.prisma.apiKey
      .update({ where: { id: apiKeyRecord.id }, data: { lastUsedAt: new Date() } })
      .catch((err) => {
        request.log.warn({ err }, 'Failed to update apiKey lastUsedAt');
      });
  }
}

/**
 * Fastify authentication plugin.
 * Registers global preHandler hook checking for valid credentials on non-public routes.
 */
export const authPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorate('authenticate', authenticateApiKey);

  fastify.addHook('preHandler', async (request, reply) => {
    // Skip OPTIONS preflight
    if (request.method === 'OPTIONS') {
      return;
    }

    // Skip routes configured as public
    if (request.routeOptions.config?.isPublic === true) {
      return;
    }

    // Skip health check endpoints
    const url = request.url.split('?')[0] ?? request.url;
    if (url === '/v1/health' || url === '/v1/health/ready' || url === '/health') {
      return;
    }

    // Skip Swagger documentation routes
    if (url.startsWith('/docs') || url.startsWith('/docs/')) {
      return;
    }

    await authenticateApiKey(request, reply);
  });
};

export default authPlugin;
