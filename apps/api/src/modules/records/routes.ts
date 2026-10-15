/**
 * @fileoverview Record routes for notarization, verification, retrieval, and listing.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { unauthorizedError } from '../../lib/errors.js';
import { RecordService } from './service.js';

const createRecordSchema = z
  .object({
    type: z.string().min(1, 'Record type is required').max(100),
    externalReference: z.string().max(255).optional(),
    content: z.unknown().optional(),
    contentHash: z.string().optional(),
  })
  .refine((data) => data.content !== undefined || Boolean(data.contentHash), {
    message: 'Either content or contentHash must be provided',
    path: ['content'],
  });

const recordParamsSchema = z.object({
  recordId: z.string().min(1, 'recordId is required'),
});

const verifyRecordSchema = z
  .object({
    content: z.unknown().optional(),
    contentHash: z.string().optional(),
  })
  .refine((data) => data.content !== undefined || Boolean(data.contentHash), {
    message: 'Either content or contentHash must be provided to verify',
  });

const listRecordsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.string().optional(),
  status: z.string().optional(),
});

/**
 * Record module routes.
 */
export const recordRoutes: FastifyPluginAsync = async (fastify) => {
  const recordService = new RecordService(fastify.prisma);

  /**
   * Helper to ensure authenticated project context is present.
   */
  function requireProjectId(projectId?: string): string {
    if (!projectId) {
      throw unauthorizedError('Missing tenant project context. Valid API key required.');
    }
    return projectId;
  }

  /**
   * POST /records - Create and anchor a new record.
   */
  fastify.post('/records', async (request, reply) => {
    const projectId = requireProjectId(request.projectId);

    const parsedBody = createRecordSchema.safeParse(request.body);
    if (!parsedBody.success) {
      throw parsedBody.error;
    }

    const idempotencyHeader = request.headers['idempotency-key'];
    const idempotencyKey =
      typeof idempotencyHeader === 'string' && idempotencyHeader.trim().length > 0
        ? idempotencyHeader.trim()
        : undefined;

    const result = await recordService.createRecord(projectId, parsedBody.data, idempotencyKey);

    return reply.status(202).send({
      recordId: result.record.id,
      type: result.record.type,
      externalReference: result.record.externalReference,
      contentHash: result.record.contentHash,
      status: result.record.status,
      transaction: {
        id: result.transaction.id,
        chainId: result.transaction.chainId,
        transactionHash: result.transaction.transactionHash,
        status: result.transaction.status,
        submittedAt: result.transaction.submittedAt,
      },
      createdAt: result.record.createdAt,
      isReplay: Boolean(result.isIdempotentReplay),
    });
  });

  /**
   * GET /records/:recordId - Retrieve record and its transaction history.
   */
  fastify.get('/records/:recordId', async (request, reply) => {
    const projectId = requireProjectId(request.projectId);

    const parsedParams = recordParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw parsedParams.error;
    }

    const record = await recordService.getRecord(projectId, parsedParams.data.recordId);
    return reply.status(200).send({ record });
  });

  /**
   * POST /records/:recordId/verify - Verify integrity of content against stored hash and chain.
   */
  fastify.post('/records/:recordId/verify', async (request, reply) => {
    const projectId = requireProjectId(request.projectId);

    const parsedParams = recordParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw parsedParams.error;
    }

    const parsedBody = verifyRecordSchema.safeParse(request.body);
    if (!parsedBody.success) {
      throw parsedBody.error;
    }

    const verification = await recordService.verifyRecord(
      projectId,
      parsedParams.data.recordId,
      parsedBody.data
    );

    return reply.status(200).send(verification);
  });

  /**
   * GET /records - List tenant records with pagination and filtering.
   */
  fastify.get('/records', async (request, reply) => {
    const projectId = requireProjectId(request.projectId);

    const parsedQuery = listRecordsQuerySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      throw parsedQuery.error;
    }

    const result = await recordService.listRecords(projectId, parsedQuery.data);
    return reply.status(200).send(result);
  });
};

export default recordRoutes;
