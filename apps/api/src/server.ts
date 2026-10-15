/**
 * @fileoverview Main server entry point for the ChainKit Fastify API.
 * Handles process lifecycle, signals, and boot sequence.
 */

import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';

/**
 * Boots the Fastify server and registers graceful shutdown handlers.
 */
async function start(): Promise<void> {
  try {
    const app = await buildApp();

    const shutdown = async (signal: string) => {
      logger.info({ signal }, `Received ${signal}, shutting down gracefully...`);
      const forceTimer = setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10_000);
      forceTimer.unref();

      try {
        await app.close();
        logger.info('ChainKit API server closed successfully');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during graceful shutdown');
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    const address = await app.listen({
      port: env.PORT,
      host: '0.0.0.0',
    });

    logger.info(`ChainKit API server listening on ${address}`);
    logger.info(`Swagger documentation available at ${address}/docs`);
  } catch (error) {
    logger.error({ err: error }, 'Failed to start ChainKit API server');
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, 'Unhandled promise rejection');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception — shutting down');
  process.exit(1);
});

// Start server
void start();
