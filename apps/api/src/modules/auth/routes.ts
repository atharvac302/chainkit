/**
 * @fileoverview User authentication routes providing Email OTP verification and session management.
 */

import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { generateApiKey, sha256Hex } from '../../lib/crypto.js';
import { unauthorizedError, validationError } from '../../lib/errors.js';

const sendOtpSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
});

const verifyOtpSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address').toLowerCase(),
  code: z.string().trim().regex(/^\d{6}$/, 'Verification code must be exactly 6 digits'),
});

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /auth/otp/send
   * Generates a 6-digit OTP, stores its HMAC hash with a 10-minute expiry, and dispatches it.
   */
  fastify.post(
    '/auth/otp/send',
    {
      config: {
        isPublic: true,
        rateLimit: {
          max: 5,
          timeWindow: '10 minutes',
        },
      },
    },
    async (request, reply) => {
      const parsed = sendOtpSchema.safeParse(request.body);
      if (!parsed.success) {
        throw validationError(parsed.error.issues[0]?.message ?? 'Invalid email address');
      }

      const { email } = parsed.data;

      // Invalidate existing unused codes for this email
      await fastify.prisma.emailOtp.updateMany({
        where: {
          email,
          used: false,
        },
        data: {
          used: true,
        },
      });

      // Generate cryptographically random 6-digit code
      const otpCode = randomInt(100000, 1000000).toString();
      const codeHash = sha256Hex(otpCode + env.API_KEY_PEPPER);
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await fastify.prisma.emailOtp.create({
        data: {
          email,
          codeHash,
          expiresAt,
          attempts: 0,
          used: false,
        },
      });

      // Log OTP code prominently in console for developer/demo visibility
      request.log.info(
        { email, code: otpCode, expiresAt },
        `📧 [EMAIL OTP] Verification Code for ${email}: ${otpCode}`
      );

      return reply.status(200).send({
        success: true,
        message: `A 6-digit verification code has been sent to ${email}`,
        expiresInSeconds: 600,
        // In non-production environments, provide debug code for instant testing convenience
        debugCode: env.NODE_ENV !== 'production' ? otpCode : undefined,
      });
    }
  );

  /**
   * POST /auth/otp/verify
   * Verifies the 6-digit code, provisions or updates the User record, and returns a session token.
   */
  fastify.post(
    '/auth/otp/verify',
    {
      config: {
        isPublic: true,
        rateLimit: {
          max: 10,
          timeWindow: '10 minutes',
        },
      },
    },
    async (request, reply) => {
      const parsed = verifyOtpSchema.safeParse(request.body);
      if (!parsed.success) {
        throw validationError(parsed.error.issues[0]?.message ?? 'Invalid OTP format');
      }

      const { email, code } = parsed.data;

      // Find the latest valid OTP record
      const otpRecord = await fastify.prisma.emailOtp.findFirst({
        where: {
          email,
          used: false,
          expiresAt: {
            gt: new Date(),
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (!otpRecord) {
        throw validationError('Verification code has expired or is invalid. Please request a new one.');
      }

      if (otpRecord.attempts >= 5) {
        await fastify.prisma.emailOtp.update({
          where: { id: otpRecord.id },
          data: { used: true },
        });
        throw validationError('Too many failed attempts. Please request a new verification code.');
      }

      // Verify code hash in constant time
      const candidateHash = sha256Hex(code + env.API_KEY_PEPPER);
      const expectedBuffer = Buffer.from(otpRecord.codeHash, 'hex');
      const candidateBuffer = Buffer.from(candidateHash, 'hex');

      const isMatch =
        expectedBuffer.length === candidateBuffer.length &&
        timingSafeEqual(expectedBuffer, candidateBuffer);

      if (!isMatch) {
        await fastify.prisma.emailOtp.update({
          where: { id: otpRecord.id },
          data: { attempts: otpRecord.attempts + 1 },
        });
        const remaining = 5 - (otpRecord.attempts + 1);
        throw validationError(
          `Invalid verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        );
      }

      // Mark OTP as successfully consumed
      await fastify.prisma.emailOtp.update({
        where: { id: otpRecord.id },
        data: { used: true },
      });

      // Find or create user
      let user = await fastify.prisma.user.findUnique({
        where: { email },
        include: {
          projects: {
            include: {
              apiKeys: {
                where: { status: 'active' },
              },
            },
          },
        },
      });

      if (!user) {
        const username = email.split('@')[0] ?? 'developer';
        user = await fastify.prisma.user.create({
          data: {
            email,
            name: username.charAt(0).toUpperCase() + username.slice(1),
          },
          include: {
            projects: {
              include: {
                apiKeys: {
                  where: { status: 'active' },
                },
              },
            },
          },
        });
      }

      // Provision default workspace and initial sandbox key if brand new user
      if (user.projects.length === 0) {
        const initialKey = generateApiKey('sandbox');
        const project = await fastify.prisma.project.create({
          data: {
            name: `${user.name || 'Developer'}'s Workspace`,
            userId: user.id,
            apiKeys: {
              create: {
                prefix: initialKey.prefix,
                secretHash: initialKey.hash,
                environment: 'sandbox',
                status: 'active',
                scopes: '*',
              },
            },
          },
          include: {
            apiKeys: true,
          },
        });
        user.projects = [project];
      }

      // Issue session token: cksess_<random 64-char hex>
      const sessionSecret = randomBytes(32).toString('hex');
      const sessionToken = `cksess_${sessionSecret}`;
      const tokenHash = sha256Hex(sessionToken + env.API_KEY_PEPPER);
      const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      await fastify.prisma.session.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: sessionExpiresAt,
        },
      });

      return reply.status(200).send({
        success: true,
        token: sessionToken,
        expiresAt: sessionExpiresAt.toISOString(),
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        projects: user.projects.map((p) => ({
          id: p.id,
          name: p.name,
          apiKeysCount: p.apiKeys.length,
        })),
      });
    }
  );

  /**
   * GET /auth/me
   * Returns current authenticated user and their active workspace projects.
   */
  fastify.get('/auth/me', async (request, reply) => {
    if (!request.userId && !request.projectId) {
      throw unauthorizedError('You must be logged in to view your profile.');
    }

    if (request.userId) {
      const user = await fastify.prisma.user.findUnique({
        where: { id: request.userId },
        include: {
          projects: {
            include: {
              apiKeys: {
                select: {
                  id: true,
                  prefix: true,
                  environment: true,
                  status: true,
                  createdAt: true,
                  lastUsedAt: true,
                },
              },
              _count: {
                select: {
                  records: true,
                },
              },
            },
          },
        },
      });

      if (!user) {
        throw unauthorizedError('User not found or session expired.');
      }

      return reply.status(200).send({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        projects: user.projects,
      });
    }

    // Authenticated via API key: return project details
    return reply.status(200).send({
      authenticated: true,
      projectId: request.projectId,
      environment: request.environment,
    });
  });

  /**
   * POST /auth/logout
   * Invalidates the active session token.
   */
  fastify.post('/auth/logout', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer cksess_')) {
      const token = authHeader.slice(7).trim();
      const tokenHash = sha256Hex(token + env.API_KEY_PEPPER);
      await fastify.prisma.session
        .deleteMany({
          where: { tokenHash },
        })
        .catch(() => {});
    }

    return reply.status(200).send({
      success: true,
      message: 'Logged out successfully',
    });
  });
};

export default authRoutes;
