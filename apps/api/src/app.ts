/**
 * @fileoverview Fastify application factory function.
 * Configures plugins, middlewares, error handlers, and route modules.
 */

import fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { env } from './config/env.js';
import { errorHandler } from './lib/errors.js';
import { loggerOptions } from './lib/logger.js';
import { generateRequestId } from './lib/request-context.js';
import databasePlugin from './plugins/database.js';
import authPlugin from './plugins/auth.js';
import rateLimitPlugin from './plugins/rate-limit.js';
import healthRoutes from './modules/health/routes.js';
import projectRoutes from './modules/projects/routes.js';
import apiKeyRoutes from './modules/api-keys/routes.js';
import recordRoutes from './modules/records/routes.js';
import transactionRoutes from './modules/transactions/routes.js';
import authRoutes from './modules/auth/routes.js';

export interface BuildAppOptions extends FastifyServerOptions {
  skipDatabase?: boolean;
}

/**
 * Builds and configures the Fastify application instance.
 *
 * @param options - Optional server configuration overrides.
 * @returns Configured FastifyInstance ready for testing or listening.
 */
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const { skipDatabase = false, ...fastifyOpts } = options;

  const app = fastify({
    trustProxy: true,
    bodyLimit: 524288,
    logger: loggerOptions,
    genReqId: (req) => {
      const header = req.headers['x-request-id'];
      if (typeof header === 'string') {
        const trimmed = header.trim();
        if (trimmed.length > 0 && trimmed.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(trimmed)) {
          return trimmed;
        }
      }
      return generateRequestId();
    },
    disableRequestLogging: false,
    ...fastifyOpts,
  });

  // 1. Request context and tracing
  app.decorateRequest('requestId', '');
  app.decorateRequest('projectId', undefined);
  app.decorateRequest('environment', undefined);
  app.decorateRequest('apiKeyId', undefined);
  app.decorateRequest('userId', undefined);
  app.decorateRequest('userEmail', undefined);

  app.addHook('onRequest', async (request, reply) => {
    request.requestId = request.id;
    reply.header('x-request-id', request.id);
  });

  // 2. Cross-Origin Resource Sharing (CORS)
  const isAllOrigins = env.ALLOWED_ORIGINS.includes('*');
  await app.register(cors, {
    origin: isAllOrigins ? '*' : env.ALLOWED_ORIGINS,
    credentials: !isAllOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-API-Key',
      'Idempotency-Key',
      'X-Request-ID',
    ],
    exposedHeaders: ['X-Request-ID', 'Retry-After'],
  });

  // 3. Security Headers with Helmet
  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"], // swagger-ui needs inline scripts
        styleSrc: ["'self'", "'unsafe-inline'"], // swagger-ui needs inline styles
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow Swagger UI assets
  });

  // 4. API Documentation with Swagger
  if (env.NODE_ENV !== 'production') {
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'ChainKit Blockchain-as-a-Service API',
          description: 'Enterprise developer platform for immutable blockchain notarization and anchoring',
          version: '0.1.0',
        },
        components: {
          securitySchemes: {
            apiKeyAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'API Key',
            },
          },
        },
      },
    });

    await app.register(swaggerUi, {
      routePrefix: '/docs',
      uiConfig: {
        docExpansion: 'list',
        deepLinking: true,
      },
    });
  }

  // 5. Database Plugin (Prisma)
  if (!skipDatabase) {
    await app.register(databasePlugin);
  }

  // 6. Authentication Plugin
  await app.register(authPlugin);

  // 7. Rate Limiting Plugin (registered after auth so preHandler has populated request.apiKeyId)
  await app.register(rateLimitPlugin);

  // 8. Route Modules
  // Health checks registered under /v1
  await app.register(healthRoutes, { prefix: '/v1' });

  // Core API modules under /v1
  await app.register(projectRoutes, { prefix: '/v1' });
  await app.register(apiKeyRoutes, { prefix: '/v1' });
  await app.register(recordRoutes, { prefix: '/v1' });
  await app.register(transactionRoutes, { prefix: '/v1' });
  await app.register(authRoutes, { prefix: '/v1' });

  // 8. Global Error Handler
  app.setErrorHandler(errorHandler);

  // 9. Standardized 404 Handler
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: `Route ${request.method} ${request.url} not found`,
        requestId: request.requestId,
      },
    });
  });

  return app;
}

export default buildApp;
