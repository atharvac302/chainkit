/**
 * @fileoverview Rate limiting plugin utilizing @fastify/rate-limit.
 * Throttles requests by authenticated API key, falling back to client IP.
 */

import rateLimit from '@fastify/rate-limit';
import type { FastifyPluginAsync } from 'fastify';

/**
 * Fastify rate-limiting plugin enforcing 100 requests per minute quota.
 */
export const rateLimitPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: 60 * 1000, // 1 minute
    cache: 10000,
    allowList: (request) => {
      // Exempt health check routes from rate limits
      const path = request.url.split('?')[0] ?? request.url;
      return path === '/v1/health' || path === '/v1/health/ready' || path === '/health';
    },
    keyGenerator: (request) => {
      // Prefer identified API key ID, then custom key header, then IP
      if (request.apiKeyId) {
        return request.apiKeyId;
      }
      const rawHeader = request.headers['x-api-key'] || request.headers.authorization;
      if (typeof rawHeader === 'string' && rawHeader.length > 0) {
        return rawHeader.slice(0, 32);
      }
      return request.ip;
    },
    errorResponseBuilder: (request, context) => {
      const retryAfterSec = Math.max(1, Math.ceil(context.ttl / 1000));
      return {
        statusCode: 429,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit of 100 requests per minute exceeded. Try again in ${retryAfterSec} seconds.`,
          retryAfter: retryAfterSec,
          requestId: request.requestId,
        },
      };
    },
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },
  });
};

export default rateLimitPlugin;
