/**
 * @fileoverview Pino logger configuration with strict redaction of sensitive credentials.
 */

import pino, { type Logger, type LoggerOptions } from 'pino';

/**
 * Paths redacted from logs to protect secrets, authorization tokens, and credentials.
 */
export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers.x-api-key',
  'headers.authorization',
  'headers.cookie',
  'headers.x-api-key',
  'authorization',
  'apiKey',
  'secret',
  'secretHash',
  'relayerPrivateKey',
  'privateKey',
  'password',
  '*.apiKey',
  '*.secret',
  '*.secretHash',
  '*.privateKey',
  '*.relayerPrivateKey',
  '*.authorization',
  '*.x-api-key',
];

/**
 * Base Pino logger options.
 */
export const loggerOptions: LoggerOptions = {
  level: process.env.NODE_ENV === 'test' ? 'silent' : process.env.LOG_LEVEL || 'info',
  redact: {
    paths: REDACT_PATHS,
    censor: '[REDACTED]',
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
};

/**
 * Singleton Pino logger instance.
 */
export const logger: Logger = pino(loggerOptions);
