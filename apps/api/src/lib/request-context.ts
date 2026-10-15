/**
 * @fileoverview Request context helpers and Fastify decorators for request tracing and tenant isolation.
 */

import { randomUUID } from 'node:crypto';
import 'fastify';

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

