/**
 * @fileoverview Transaction routes for checking on-chain submission status and receipts.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { unauthorizedError } from '../../lib/errors.js';
import { TransactionService } from './service.js';

const transactionParamsSchema = z.object({
  transactionId: z.string().min(1, 'transactionId is required'),
});

/**
 * Transaction module routes.
 */
export const transactionRoutes: FastifyPluginAsync = async (fastify) => {
  const transactionService = new TransactionService(fastify.prisma);

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
   * GET /transactions/:transactionId - Retrieve transaction status scoped to project.
   */
  fastify.get('/transactions/:transactionId', async (request, reply) => {
    const projectId = requireProjectId(request.projectId);

    const parsedParams = transactionParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw parsedParams.error;
    }

    const transaction = await transactionService.getTransaction(
      parsedParams.data.transactionId,
      projectId
    );

    return reply.status(200).send({ transaction });
  });
};

export default transactionRoutes;
