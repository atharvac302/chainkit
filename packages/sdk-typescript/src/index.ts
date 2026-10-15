/**
 * ChainKit TypeScript SDK
 *
 * Official TypeScript client library for the ChainKit Blockchain-as-a-Service platform.
 * Provides high-level abstractions for record anchoring, status checking, cryptographic
 * verification, and transaction tracking.
 *
 * @packageDocumentation
 */

export { ChainKit } from './client.js';
export { RecordsResource } from './resources/records.js';
export { TransactionsResource } from './resources/transactions.js';

export {
  ChainKitError,
  ValidationError,
  AuthenticationError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ServerError,
  createErrorFromResponse,
} from './errors.js';

export type {
  ChainKitConfig,
  CreateRecordInput,
  VerifyRecordInput,
  RecordResponse,
  VerifyResponse,
  TransactionResponse,
  PaginatedResponse,
  ListRecordsOptions,
  ChainKitErrorResponse,
  RecordStatus,
  TransactionStatus,
  RequestFunction,
} from './types.js';

import { ChainKit } from './client.js';
export default ChainKit;
