/**
 * @fileoverview API key management routes for creating, listing, revoking, and rotating tenant API keys.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { generateApiKey } from '../../lib/crypto.js';
import { forbiddenError, notFoundError } from '../../lib/errors.js';

const projectParamsSchema = z.object({
  projectId: z.string().min(1, 'projectId is required'),
});

const keyParamsSchema = z.object({
  projectId: z.string().min(1, 'projectId is required'),
  keyId: z.string().min(1, 'keyId is required'),
});

const createApiKeyBodySchema = z.object({
  environment: z.enum(['sandbox', 'live', 'production', 'test']).default('sandbox'),
  scopes: z.string().default('*'),
});

/**
 * API key management routes.
 */
export const apiKeyRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Helper to ensure the authenticated request matches the requested projectId.
   */
  function assertProjectAccess(requestedProjectId: string, authenticatedProjectId?: string): void {
    if (authenticatedProjectId && authenticatedProjectId !== requestedProjectId) {
      throw forbiddenError('You do not have permission to manage API keys for this project');
    }
  }

  /**
   * POST /projects/:projectId/api-keys - Create a new API key. Returns full key ONCE.
   */
  fastify.post('/projects/:projectId/api-keys', async (request, reply) => {
    const parsedParams = projectParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw parsedParams.error;
    }
    const { projectId } = parsedParams.data;
    assertProjectAccess(projectId, request.projectId);

    const parsedBody = createApiKeyBodySchema.safeParse(request.body ?? {});
    if (!parsedBody.success) {
      throw parsedBody.error;
    }
    const { environment, scopes } = parsedBody.data;

    // Verify project exists
    const project = await fastify.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) {
      throw notFoundError(`Project ${projectId} not found`);
    }

    const keyData = generateApiKey(environment);

    const apiKey = await fastify.prisma.apiKey.create({
      data: {
        projectId,
        prefix: keyData.prefix,
        secretHash: keyData.hash,
        environment,
        status: 'active',
        scopes,
      },
    });

    return reply.status(201).send({
      apiKey: {
        id: apiKey.id,
        projectId: apiKey.projectId,
        prefix: apiKey.prefix,
        environment: apiKey.environment,
        status: apiKey.status,
        scopes: apiKey.scopes,
        createdAt: apiKey.createdAt,
        key: keyData.fullKey, // Returned ONCE
      },
    });
  });

  /**
   * GET /projects/:projectId/api-keys - List API keys (without raw secrets).
   */
  fastify.get('/projects/:projectId/api-keys', async (request, reply) => {
    const parsedParams = projectParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw parsedParams.error;
    }
    const { projectId } = parsedParams.data;
    assertProjectAccess(projectId, request.projectId);

    const apiKeys = await fastify.prisma.apiKey.findMany({
      where: { projectId },
      select: {
        id: true,
        projectId: true,
        prefix: true,
        environment: true,
        status: true,
        scopes: true,
        createdAt: true,
        lastUsedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return reply.status(200).send({ apiKeys });
  });

  /**
   * DELETE /projects/:projectId/api-keys/:keyId - Revoke an API key.
   */
  fastify.delete('/projects/:projectId/api-keys/:keyId', async (request, reply) => {
    const parsedParams = keyParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw parsedParams.error;
    }
    const { projectId, keyId } = parsedParams.data;
    assertProjectAccess(projectId, request.projectId);

    const apiKey = await fastify.prisma.apiKey.findFirst({
      where: { id: keyId, projectId },
    });

    if (!apiKey) {
      throw notFoundError(`API key ${keyId} not found for this project`);
    }

    const updated = await fastify.prisma.apiKey.update({
      where: { id: keyId },
      data: { status: 'revoked' },
      select: {
        id: true,
        prefix: true,
        status: true,
      },
    });

    return reply.status(200).send({
      message: 'API key successfully revoked',
      apiKey: updated,
    });
  });

  /**
   * POST /projects/:projectId/api-keys/:keyId/rotate - Revoke existing key and issue a new one.
   */
  fastify.post('/projects/:projectId/api-keys/:keyId/rotate', async (request, reply) => {
    const parsedParams = keyParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw parsedParams.error;
    }
    const { projectId, keyId } = parsedParams.data;
    assertProjectAccess(projectId, request.projectId);

    const existingKey = await fastify.prisma.apiKey.findFirst({
      where: { id: keyId, projectId },
    });

    if (!existingKey) {
      throw notFoundError(`API key ${keyId} not found for this project`);
    }

    const newKeyData = generateApiKey(existingKey.environment);

    const result = await fastify.prisma.$transaction(async (tx) => {
      await tx.apiKey.update({
        where: { id: keyId },
        data: { status: 'revoked' },
      });

      const createdKey = await tx.apiKey.create({
        data: {
          projectId,
          prefix: newKeyData.prefix,
          secretHash: newKeyData.hash,
          environment: existingKey.environment,
          status: 'active',
          scopes: existingKey.scopes,
        },
      });

      return createdKey;
    });

    return reply.status(201).send({
      message: 'API key successfully rotated',
      revokedKeyId: keyId,
      apiKey: {
        id: result.id,
        projectId: result.projectId,
        prefix: result.prefix,
        environment: result.environment,
        status: result.status,
        scopes: result.scopes,
        createdAt: result.createdAt,
        key: newKeyData.fullKey, // Returned ONCE
      },
    });
  });
};

export default apiKeyRoutes;
