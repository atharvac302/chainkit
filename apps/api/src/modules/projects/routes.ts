/**
 * @fileoverview Project management routes for creating projects and retrieving project details.
 */

import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { generateApiKey } from '../../lib/crypto.js';
import { forbiddenError, notFoundError } from '../../lib/errors.js';

const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required').max(100, 'Project name is too long'),
});

const getProjectParamsSchema = z.object({
  projectId: z.string().min(1, 'projectId is required'),
});

/**
 * Projects module routes.
 */
export const projectRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /projects - Create a new project along with its initial sandbox API key.
   */
  fastify.post(
    '/projects',
    {
      config: { isPublic: true },
    },
    async (request, reply) => {
      const parsedBody = createProjectSchema.safeParse(request.body);
      if (!parsedBody.success) {
        throw parsedBody.error;
      }

      const { name } = parsedBody.data;
      const initialKey = generateApiKey('sandbox');

      const result = await fastify.prisma.$transaction(async (tx) => {
        const project = await tx.project.create({
          data: {
            name,
          },
        });

        const apiKey = await tx.apiKey.create({
          data: {
            projectId: project.id,
            prefix: initialKey.prefix,
            secretHash: initialKey.hash,
            environment: 'sandbox',
            status: 'active',
            scopes: '*',
          },
        });

        return { project, apiKey };
      });

      return reply.status(201).send({
        project: {
          id: result.project.id,
          name: result.project.name,
          createdAt: result.project.createdAt,
        },
        apiKey: {
          id: result.apiKey.id,
          prefix: result.apiKey.prefix,
          environment: result.apiKey.environment,
          key: initialKey.fullKey, // Returned ONCE on creation
          createdAt: result.apiKey.createdAt,
        },
      });
    }
  );

  /**
   * GET /projects/:projectId - Get details of an existing project (authenticated, tenant-scoped).
   */
  fastify.get('/projects/:projectId', async (request, reply) => {
    const parsedParams = getProjectParamsSchema.safeParse(request.params);
    if (!parsedParams.success) {
      throw parsedParams.error;
    }

    const { projectId } = parsedParams.data;

    // Ensure client cannot access another project's resources
    if (request.projectId && request.projectId !== projectId) {
      throw forbiddenError('You do not have permission to access this project');
    }

    const project = await fastify.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        _count: {
          select: {
            records: true,
            apiKeys: true,
          },
        },
      },
    });

    if (!project) {
      throw notFoundError(`Project with ID ${projectId} not found`);
    }

    return reply.status(200).send({ project });
  });
};

export default projectRoutes;
