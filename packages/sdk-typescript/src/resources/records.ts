/**
 * ChainKit TypeScript SDK - Records Resource
 *
 * Provides operations for anchoring, retrieving, listing, and cryptographically
 * verifying tamper-proof data records.
 *
 * @module @chainkit/sdk/resources/records
 */

import { ValidationError } from '../errors.js';
import type {
  CreateRecordInput,
  ListRecordsOptions,
  PaginatedResponse,
  RecordResponse,
  RequestFunction,
  VerifyRecordInput,
  VerifyResponse,
} from '../types.js';

/**
 * Resource client for interacting with ChainKit record endpoints.
 */
export class RecordsResource {
  /**
   * Internal function to execute authenticated HTTP requests.
   */
  private readonly request: RequestFunction;

  /**
   * Initialize a new RecordsResource instance.
   *
   * @param request - Authenticated request handler function.
   */
  constructor(request: RequestFunction) {
    this.request = request;
  }

  /**
   * Anchor a new record on the blockchain.
   *
   * Submits the record metadata and payload digest to the ChainKit registry.
   * Supports optional idempotency key to prevent duplicate processing on retries.
   *
   * @param input - Record creation parameters.
   * @returns The created record response.
   * @throws {ValidationError} If required input fields are missing or invalid.
   */
  public async create(input: CreateRecordInput): Promise<RecordResponse> {
    if (!input || typeof input !== 'object') {
      throw new ValidationError('CreateRecordInput must be a valid object');
    }

    if (!input.type || typeof input.type !== 'string' || input.type.trim() === '') {
      throw new ValidationError('Record "type" is required and must be a non-empty string');
    }

    if (!input.externalId || typeof input.externalId !== 'string' || input.externalId.trim() === '') {
      throw new ValidationError('Record "externalId" is required and must be a non-empty string');
    }

    if (!input.content && !input.contentHash) {
      throw new ValidationError('Either "content" or "contentHash" must be provided to create a record');
    }

    const { idempotencyKey, ...payload } = input;
    const headers: Record<string, string> = {};

    if (idempotencyKey && typeof idempotencyKey === 'string' && idempotencyKey.trim() !== '') {
      headers['Idempotency-Key'] = idempotencyKey.trim();
    }

    return this.request<RecordResponse>('POST', '/v1/records', payload, headers);
  }

  /**
   * Retrieve an anchored record by its unique record ID.
   *
   * @param recordId - The unique identifier of the record.
   * @returns The record response including anchoring status and content hash.
   * @throws {ValidationError} If recordId is empty or invalid.
   */
  public async get(recordId: string): Promise<RecordResponse> {
    if (!recordId || typeof recordId !== 'string' || recordId.trim() === '') {
      throw new ValidationError('recordId is required and must be a non-empty string');
    }

    return this.request<RecordResponse>(
      'GET',
      `/v1/records/${encodeURIComponent(recordId.trim())}`
    );
  }

  /**
   * Verify the cryptographic integrity of a record against the on-chain digest.
   *
   * @param recordId - The identifier of the record to verify.
   * @param input - Content or pre-calculated hash to compare against on-chain record.
   * @returns Verification result including boolean `verified` and current status.
   * @throws {ValidationError} If recordId or verification input is invalid.
   */
  public async verify(
    recordId: string,
    input: VerifyRecordInput
  ): Promise<VerifyResponse> {
    if (!recordId || typeof recordId !== 'string' || recordId.trim() === '') {
      throw new ValidationError('recordId is required and must be a non-empty string');
    }

    if (!input || typeof input !== 'object') {
      throw new ValidationError('VerifyRecordInput must be an object');
    }

    if (!input.content && !input.contentHash) {
      throw new ValidationError('Either "content" or "contentHash" must be provided to verify a record');
    }

    return this.request<VerifyResponse>(
      'POST',
      `/v1/records/${encodeURIComponent(recordId.trim())}/verify`,
      input
    );
  }

  /**
   * List anchored records with optional pagination and filtering.
   *
   * @param options - Pagination options (page, limit).
   * @returns A paginated response containing matching records.
   */
  public async list(
    options?: ListRecordsOptions
  ): Promise<PaginatedResponse<RecordResponse>> {
    const searchParams = new URLSearchParams();

    if (options?.page !== undefined) {
      if (typeof options.page !== 'number' || options.page < 1) {
        throw new ValidationError('Page must be a positive integer');
      }
      searchParams.set('page', String(Math.floor(options.page)));
    }

    if (options?.limit !== undefined) {
      if (typeof options.limit !== 'number' || options.limit < 1) {
        throw new ValidationError('Limit must be a positive integer');
      }
      searchParams.set('limit', String(Math.floor(options.limit)));
    }

    if (options?.type) {
      searchParams.set('type', options.type);
    }

    if (options?.status) {
      searchParams.set('status', options.status);
    }

    const query = searchParams.toString();
    const path = query.length > 0 ? `/v1/records?${query}` : '/v1/records';

    return this.request<PaginatedResponse<RecordResponse>>('GET', path);
  }
}
