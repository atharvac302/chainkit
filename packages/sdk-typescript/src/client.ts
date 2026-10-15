/**
 * ChainKit TypeScript SDK - Main Client
 *
 * Core SDK client class providing authenticated connectivity and resource access
 * to the ChainKit Blockchain-as-a-Service platform.
 *
 * @module @chainkit/sdk/client
 */

import { ChainKitError, ValidationError, createErrorFromResponse } from './errors.js';
import { RecordsResource } from './resources/records.js';
import { TransactionsResource } from './resources/transactions.js';
import type { ChainKitConfig, RequestFunction } from './types.js';

/**
 * Default API gateway URL for ChainKit.
 */
const DEFAULT_BASE_URL = 'http://localhost:3001';

/**
 * Default HTTP request timeout in milliseconds (30 seconds).
 */
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Primary client entry point for interacting with ChainKit APIs.
 *
 * Handles authenticated communication, automatic header injection,
 * error translation, and resource scoping.
 *
 * @example
 * ```typescript
 * import { ChainKit } from '@chainkit/sdk';
 *
 * const chainkit = new ChainKit({
 *   apiKey: process.env.CHAINKIT_API_KEY!,
 *   baseUrl: process.env.CHAINKIT_BASE_URL,
 * });
 *
 * const record = await chainkit.records.create({
 *   type: 'invoice',
 *   externalId: 'inv_123',
 *   content: JSON.stringify({ total: 1000, currency: 'USD' }),
 * });
 * ```
 */
export class ChainKit {
  /**
   * Secret API key for authenticating with the ChainKit platform.
   */
  private readonly apiKey: string;

  /**
   * Base URL of the target ChainKit API instance (normalized without trailing slashes).
   */
  private readonly baseUrl: string;

  /**
   * Network timeout in milliseconds.
   */
  private readonly timeout: number;

  /**
   * Access to record anchoring, retrieval, and verification operations.
   */
  public readonly records: RecordsResource;

  /**
   * Access to blockchain transaction inspection operations.
   */
  public readonly transactions: TransactionsResource;

  /**
   * Initialize a new instance of the ChainKit client.
   *
   * @param config - Configuration options including API key, base URL, and timeout.
   * @throws {ValidationError} If apiKey is missing, empty, or not a string.
   */
  constructor(config: ChainKitConfig) {
    if (!config || typeof config !== 'object') {
      throw new ValidationError('A configuration object is required to initialize ChainKit');
    }

    if (!config.apiKey || typeof config.apiKey !== 'string' || config.apiKey.trim() === '') {
      throw new ValidationError('API key is required to initialize ChainKit client');
    }

    this.apiKey = config.apiKey.trim();
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).trim().replace(/\/+$/, '');
    this.timeout = typeof config.timeout === 'number' && config.timeout > 0 ? config.timeout : DEFAULT_TIMEOUT_MS;

    const boundRequest: RequestFunction = this.request.bind(this);
    this.records = new RecordsResource(boundRequest);
    this.transactions = new TransactionsResource(boundRequest);
  }

  /**
   * Sanitizes any occurrences of the secret API key from messages or URLs.
   *
   * @param text - The raw text that might contain an API key.
   * @returns The text with any API key instances replaced with `[REDACTED]`.
   */
  private sanitize(text: string): string {
    if (!text || !this.apiKey) {
      return text;
    }
    return text.split(this.apiKey).join('[REDACTED]');
  }

  /**
   * Internal request dispatcher executing HTTP operations with authentication,
   * timeouts, and typed error handling.
   *
   * @template T - Expected JSON response structure.
   * @param method - HTTP verb ('GET', 'POST', 'PUT', 'DELETE', etc.).
   * @param path - Relative API endpoint path (e.g. '/v1/records').
   * @param body - Optional JSON-serializable request payload.
   * @param headers - Optional custom headers to merge with defaults.
   * @returns Resolves with parsed JSON response data.
   * @throws {ChainKitError} Or subclass when an HTTP error or network timeout occurs.
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${this.baseUrl}${cleanPath}`;

    const requestHeaders: Record<string, string> = {
      Authorization: `Bearer ${this.apiKey}`,
      Accept: 'application/json',
      ...headers,
    };

    if (body !== undefined) {
      requestHeaders['Content-Type'] = 'application/json';
    }

    const controller = new AbortController();
    let timeoutTriggered = false;

    const timer = setTimeout(() => {
      timeoutTriggered = true;
      controller.abort();
    }, this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const headerRequestId =
        response.headers.get('x-request-id') ??
        response.headers.get('request-id') ??
        undefined;

      if (!response.ok) {
        let errorBody: unknown;
        const contentType = response.headers.get('content-type') ?? '';
        try {
          if (contentType.includes('application/json')) {
            errorBody = await response.json();
          } else {
            errorBody = await response.text();
          }
        } catch {
          errorBody = response.statusText;
        }

        const error = createErrorFromResponse(response.status, errorBody, headerRequestId);
        // Ensure the error message never leaks the API key
        if (error.message.includes(this.apiKey)) {
          const sanitizedMessage = this.sanitize(error.message);
          Object.defineProperty(error, 'message', { value: sanitizedMessage, writable: true });
        }
        throw error;
      }

      if (response.status === 204) {
        return {} as T;
      }

      const contentType = response.headers.get('content-type') ?? '';
      if (contentType.includes('application/json')) {
        return (await response.json()) as T;
      }

      const textData = await response.text();
      try {
        return JSON.parse(textData) as T;
      } catch {
        return textData as unknown as T;
      }
    } catch (err: unknown) {
      if (err instanceof ChainKitError) {
        throw err;
      }

      if (timeoutTriggered || (err instanceof Error && err.name === 'AbortError')) {
        throw new ChainKitError(
          `Request timed out after ${this.timeout}ms`,
          'REQUEST_TIMEOUT',
          408
        );
      }

      const rawMessage = err instanceof Error ? err.message : String(err);
      const safeMessage = this.sanitize(rawMessage);
      throw new ChainKitError(
        `Network error communicating with ChainKit API: ${safeMessage}`,
        'NETWORK_ERROR',
        0
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
