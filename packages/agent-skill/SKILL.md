# ChainKit Agent Skill

```yaml
skill_name: chainkit
version: 0.1.0
sdk_package: "@chainkit/sdk"
cli_package: "@chainkit/cli"
supported_runtimes:
  - "node >= 20.0.0"
category: blockchain-as-a-service
```

---

## 1. Product Summary

ChainKit is a **Blockchain-as-a-Service (BaaS)** platform that enables enterprise applications and web services to anchor immutable data records onto EVM-compatible blockchains without managing private keys, gas fees, nonce concurrency, or node infrastructure.

### Core Capabilities:
- **Tamper-Evident Record Anchoring**: Computes or accepts cryptographic digests (SHA-256) of critical business objects (invoices, audit logs, certifications, contract states) and writes them to the blockchain registry.
- **Asynchronous Relayer Architecture**: Automatically buffers, signs, and dispatches transactions through an on-chain relayer service with gas optimization and automatic retries.
- **Cryptographic Verification**: Validates whether an arbitrary payload or pre-calculated hash matches the immutable state stored on-chain.
- **Transaction & Audit Tracking**: Provides full observability into block confirmations, transaction hashes, and lifecycle state changes (`PENDING`, `CONFIRMED`, `FAILED`).

---

## 2. Supported SDK Methods & Signatures

The `@chainkit/sdk` package exports the primary `ChainKit` client class.

```typescript
import { ChainKit } from '@chainkit/sdk';

const chainkit = new ChainKit(config: ChainKitConfig);
```

### 2.1 Configuration: `ChainKitConfig`
| Field | Type | Required | Default | Description |
| :--- | :--- | :--- | :--- | :--- |
| `apiKey` | `string` | **Yes** | — | Secret API key for authentication. |
| `baseUrl` | `string` | No | `http://localhost:3001` | Base URL of the ChainKit API service. |
| `timeout` | `number` | No | `30000` | Network timeout in milliseconds. |

### 2.2 Record Operations: `chainkit.records`

#### `records.create(input: CreateRecordInput): Promise<RecordResponse>`
Anchors a new record. Supports an optional `idempotencyKey` to prevent duplicate writes during network retries.
- **Signatures**:
  ```typescript
  interface CreateRecordInput {
    type: string;             // Domain category (e.g., "invoice", "audit_log")
    externalId: string;       // Calling application's entity ID
    content?: string;         // Plaintext/JSON content to hash
    contentHash?: string;     // Or precomputed hex SHA-256 digest
    idempotencyKey?: string;  // Unique token for safe retries
  }
  ```
- **Returns**: `RecordResponse` with `recordId`, `status`, `contentHash`, `createdAt`, `transactionId?`, `transactionHash?`.

#### `records.get(recordId: string): Promise<RecordResponse>`
Fetches the current status and details of an existing record by its ID.
- **Parameters**: `recordId: string`
- **Returns**: `RecordResponse`

#### `records.verify(recordId: string, input: VerifyRecordInput): Promise<VerifyResponse>`
Verifies data authenticity against the on-chain recorded digest.
- **Signatures**:
  ```typescript
  interface VerifyRecordInput {
    content?: string;
    contentHash?: string;
  }
  ```
- **Returns**: `VerifyResponse` with `recordId: string`, `verified: boolean`, `status: string`, `reason?: string`.

#### `records.list(options?: ListRecordsOptions): Promise<PaginatedResponse<RecordResponse>>`
Lists records with pagination and optional filtering.
- **Signatures**:
  ```typescript
  interface ListRecordsOptions {
    page?: number;   // 1-based index (default: 1)
    limit?: number;  // Items per page (default: 20)
    type?: string;   // Filter by record type
    status?: string; // Filter by status (e.g. 'CONFIRMED')
  }
  ```

### 2.3 Transaction Operations: `chainkit.transactions`

#### `transactions.get(transactionId: string): Promise<TransactionResponse>`
Retrieves blockchain transaction details submitted by the relayer.
- **Returns**: `TransactionResponse` with `id`, `recordId`, `transactionHash`, `status`, `chainId`, `submittedAt`, `confirmedAt`.

---

## 3. Environment Variable Handling (Server-Side Only)

> [!IMPORTANT]
> **Zero Frontend Exposure**: ChainKit API keys have full administrative authorization to anchor records and consume gas quotas. They must **never** be exposed in client-side code (React, Vue, Svelte, Next.js client components, mobile apps).

### Required Environment Variables:
```env
# Secret API key issued from the ChainKit developer console
CHAINKIT_API_KEY=ck_live_xxxxxxxxxxxxxxxxxxxxxxxx

# Optional: Base URL for custom or local development API instances
CHAINKIT_BASE_URL=http://localhost:3001
```

### Best Practices for Environment Configuration:
1. Load environment variables using `dotenv` or your framework's native configuration loader (e.g. Node 20 `--env-file=.env`).
2. Keep `.env` listed in `.gitignore`. Provide a sanitized `.env.example` file.
3. Validate presence of `CHAINKIT_API_KEY` during server startup and throw immediately if missing.
4. Expose ChainKit capabilities to your frontend only via authenticated, server-side API endpoints (e.g. `/api/records`).

---

## 4. Minimal Integration Examples

### Example 1: Server-Side Record Creation & Verification (Node / Express / Fastify)

```typescript
import { ChainKit, ValidationError, AuthenticationError } from '@chainkit/sdk';

// Initialize SDK client as a server-side singleton
const chainkit = new ChainKit({
  apiKey: process.env.CHAINKIT_API_KEY!,
  baseUrl: process.env.CHAINKIT_BASE_URL,
});

/**
 * Service function to anchor an invoice record.
 */
export async function anchorInvoice(invoice: { id: string; total: number; customer: string }) {
  try {
    const record = await chainkit.records.create({
      type: 'invoice',
      externalId: invoice.id,
      content: JSON.stringify(invoice),
      idempotencyKey: `invoice-${invoice.id}-v1`,
    });

    return {
      success: true,
      recordId: record.recordId,
      status: record.status,
      contentHash: record.contentHash,
    };
  } catch (error) {
    if (error instanceof ValidationError) {
      console.error('Invalid payload supplied:', error.message);
    } else if (error instanceof AuthenticationError) {
      console.error('API key rejected:', error.message);
    }
    throw error;
  }
}

/**
 * Service function to verify an invoice against on-chain hash.
 */
export async function verifyInvoice(recordId: string, currentInvoiceData: object) {
  const result = await chainkit.records.verify(recordId, {
    content: JSON.stringify(currentInvoiceData),
  });

  return {
    isAuthentic: result.verified,
    status: result.status,
    reason: result.reason,
  };
}
```

### Example 2: Polling for On-Chain Confirmation

```typescript
import { ChainKit, type RecordResponse } from '@chainkit/sdk';

const chainkit = new ChainKit({ apiKey: process.env.CHAINKIT_API_KEY! });

/**
 * Polls until the record achieves CONFIRMED status on-chain.
 */
export async function waitForConfirmation(
  recordId: string,
  timeoutMs: number = 30000,
  pollIntervalMs: number = 2000
): Promise<RecordResponse> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const record = await chainkit.records.get(recordId);

    if (record.status === 'CONFIRMED') {
      return record;
    }
    if (record.status === 'FAILED') {
      throw new Error(`Record ${recordId} failed blockchain confirmation.`);
    }

    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  throw new Error(`Confirmation timed out for record ${recordId} after ${timeoutMs}ms.`);
}
```

---

## 5. Testing Guidance

When writing automated tests for systems integrating ChainKit, do not make live network calls against production or testnet relayers. Instead, mock the `@chainkit/sdk` module or use dependency injection.

### Example Vitest / Jest Mock Pattern:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { anchorInvoice } from './invoice-service.js';
import { ChainKit } from '@chainkit/sdk';

vi.mock('@chainkit/sdk', () => {
  const mockRecords = {
    create: vi.fn(),
    get: vi.fn(),
    verify: vi.fn(),
    list: vi.fn(),
  };
  const mockTransactions = {
    get: vi.fn(),
  };

  return {
    ChainKit: vi.fn().mockImplementation(() => ({
      records: mockRecords,
      transactions: mockTransactions,
    })),
    ValidationError: class ValidationError extends Error {},
    AuthenticationError: class AuthenticationError extends Error {},
    ChainKitError: class ChainKitError extends Error {},
  };
});

describe('Invoice Service', () => {
  it('anchors invoice record and returns recordId', async () => {
    const mockSdkInstance = new ChainKit({ apiKey: 'mock' });
    vi.mocked(mockSdkInstance.records.create).mockResolvedValueOnce({
      recordId: 'rec_mock_123',
      status: 'PENDING',
      contentHash: '0xabc123',
      createdAt: '2026-10-14T00:00:00Z',
    });

    const result = await anchorInvoice({
      id: 'INV-100',
      total: 250,
      customer: 'Acme',
    });

    expect(result.recordId).toBe('rec_mock_123');
    expect(result.status).toBe('PENDING');
  });
});
```

---

## 6. Common Errors & Troubleshooting

| HTTP Status | Error Class | Code | Cause & Remediation |
| :--- | :--- | :--- | :--- |
| **400** | `ValidationError` | `VALIDATION_ERROR` | Missing required fields (`type`, `externalId`, or payload). Verify inputs before sending. |
| **401** | `AuthenticationError` | `AUTHENTICATION_ERROR` | Missing, formatted incorrectly, or revoked `CHAINKIT_API_KEY`. Check your `.env` file. |
| **403** | `ForbiddenError` | `FORBIDDEN` | Access denied. The API key does not have permissions for the requested domain or tenant. |
| **404** | `NotFoundError` | `NOT_FOUND` | The specified `recordId` or `transactionId` does not exist in ChainKit. |
| **409** | `ConflictError` | `CONFLICT` | Duplicate idempotency key or conflicting state. Use a new unique idempotency key. |
| **429** | `RateLimitError` | `RATE_LIMIT_EXCEEDED` | Request quota exceeded. Inspect `error.retryAfter` and implement exponential backoff. |
| **500** | `ServerError` | `SERVER_ERROR` | Upstream blockchain node or internal error. Contact support or check status page. |
| **408 / 0** | `ChainKitError` | `REQUEST_TIMEOUT` | Network latency exceeded configured `timeout`. Increase timeout in `ChainKitConfig`. |

---

## 7. Security Rules for Coding Agents

Agents writing or modifying code involving ChainKit MUST adhere to the following rules:

1. **Never Hardcode Secrets**: Never embed API keys, bearer tokens, or private keys directly in source code. Always use `process.env.CHAINKIT_API_KEY`.
2. **Prevent Git Commits of Credentials**: Ensure `.env` is listed in `.gitignore`. Never create files containing real production credentials.
3. **Redact Sensitive Info in Logs**: Do not log raw API keys, bearer tokens, or unmasked credentials in console logs or error messages.
4. **Server-Side Exclusivity**: If creating a web application (e.g. Next.js, Remix, Vite), ensure `@chainkit/sdk` is only imported in Server Components, Route Handlers, or API routes.
5. **Prompt / Review Before Writing**: Always show proposed code diffs and seek user confirmation before creating or altering configuration or integration files.

---

## 8. Agent Instructions: Diffs & User Review

When an AI agent is asked to integrate ChainKit into a user codebase:

1. **Inspect Workspace**: Check for existing `package.json`, `.env`, and existing backend architecture.
2. **Propose Architecture**: Explain where ChainKit client will be initialized (e.g., `lib/chainkit.ts`).
3. **Show Diffs**: Always generate and display unified file diffs for any files to be modified.
4. **Request Confirmation**: Ask the user for review and explicit approval before running write operations or installing packages.
