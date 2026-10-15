/**
 * ChainKit TypeScript SDK - Transactions Resource
 *
 * Provides operations for querying the status, confirmation, and on-chain details
 * of transactions dispatched by ChainKit's relayer.
 *
 * @module @chainkit/sdk/resources/transactions
 */

import { ValidationError } from '../errors.js';
import type { RequestFunction, TransactionResponse } from '../types.js';

/**
 * Resource client for interacting with ChainKit transaction endpoints.
 */
export class TransactionsResource {
  /**
   * Internal function to execute authenticated HTTP requests.
   */
  private readonly request: RequestFunction;

  /**
   * Initialize a new TransactionsResource instance.
   *
   * @param request - Authenticated request handler function.
   */
  constructor(request: RequestFunction) {
    this.request = request;
  }

  /**
   * Retrieve transaction details and on-chain confirmation status by transaction ID.
   *
   * @param transactionId - The unique identifier of the transaction.
   * @returns The transaction response including transaction hash, status, and chain ID.
   * @throws {ValidationError} If transactionId is missing or empty.
   */
  public async get(transactionId: string): Promise<TransactionResponse> {
    if (!transactionId || typeof transactionId !== 'string' || transactionId.trim() === '') {
      throw new ValidationError('transactionId is required and must be a non-empty string');
    }

    return this.request<TransactionResponse>(
      'GET',
      `/v1/transactions/${encodeURIComponent(transactionId.trim())}`
    );
  }
}
