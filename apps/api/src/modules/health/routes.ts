/**
 * @fileoverview Health check and readiness probe routes for ChainKit API.
 */

import type { FastifyPluginAsync } from 'fastify';
import { env } from '../../config/env.js';

/**
 * Health module routes.
 */
export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Liveness probe: returns 200 OK if service is alive.
   */
  fastify.get(
    '/health',
    {
      config: { isPublic: true },
    },
    async (_request, reply) => {
      return reply.status(200).send({
        status: 'ok',
        service: 'chainkit-api',
        timestamp: new Date().toISOString(),
      });
    }
  );

  /**
   * Readiness probe: checks database connectivity.
   */
  fastify.get(
    '/health/ready',
    {
      config: { isPublic: true },
    },
    async (request, reply) => {
      try {
        await fastify.prisma.$queryRaw`SELECT 1`;

        let blockchain = 'connected';
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          const rpcRes = await fetch(env.RPC_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          if (!rpcRes.ok) {
            blockchain = 'disconnected';
          }
        } catch {
          blockchain = 'disconnected';
        }

        return reply.status(200).send({
          status: 'ready',
          service: 'chainkit-api',
          database: 'connected',
          blockchain,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        request.log.error({ err: error }, 'Readiness check failed: Database unreachable');
        return reply.status(503).send({
          status: 'unavailable',
          service: 'chainkit-api',
          database: 'disconnected',
          error: 'Database connectivity check failed',
          timestamp: new Date().toISOString(),
        });
      }
    }
  );
};

export default healthRoutes;
