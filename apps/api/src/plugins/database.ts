/**
 * @fileoverview Fastify database plugin integrating Prisma ORM with connection lifecycle management.
 */

import { PrismaClient } from '@prisma/client';
import type { FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';

/**
 * Fastify instance augmentation for the Prisma database client.
 */
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

/**
 * Fastify plugin establishing Prisma database connection and graceful disconnection.
 */
const databasePluginBase: FastifyPluginAsync = async (fastify) => {
  const prisma = new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' },
          ]
        : [{ emit: 'stdout', level: 'error' }],
  });

  try {
    await prisma.$connect();
    fastify.log.info('Connected to database via Prisma');
  } catch (error) {
    fastify.log.error({ err: error }, 'Failed to connect to database on startup');
    throw error;
  }

  fastify.decorate('prisma', prisma);

  fastify.addHook('onClose', async (instance) => {
    instance.log.info('Disconnecting from database...');
    await instance.prisma.$disconnect();
  });
};

export const databasePlugin = fp(databasePluginBase, {
  name: 'chainkit-database',
});

export default databasePlugin;
