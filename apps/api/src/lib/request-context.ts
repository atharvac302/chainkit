/**
 * @fileoverview Request context helpers and Fastify decorators for request tracing and tenant isolation.
 */

import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';

/**
 * Fastify type augmentation to supply context fields on FastifyRequest.
 */
declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
    projectId?: string;
    environment?: string;
    apiKeyId?: string;
  }
}

/**
 * Generates a unique request identifier using UUID v4.
 *
 * @returns Unique string ID.
 */
export function generateRequestId(): string {
  return randomUUID();
}

/**
 * Request context plugin to initialize request tracing and attach context headers.
 */
export const requestContextPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('requestId', '');
  fastify.decorateRequest('projectId', undefined);
  fastify.decorateRequest('environment', undefined);
  fastify.decorateRequest('apiKeyId', undefined);

  fastify.addHook('onRequest', async (request: FastifyRequest, reply) => {
    const headerRequestId = request.headers['x-request-id'];
    const requestId =
      typeof headerRequestId === 'string' && headerRequestId.trim().length > 0
        ? headerRequestId.trim()
        : generateRequestId();

    request.requestId = requestId;
    reply.header('x-request-id', requestId);
  });
};
