# ChainKit API Reference

## Base URL

```
http://localhost:3001 (development)
```

## Authentication

All API requests (except health checks) require a Bearer token:

```
Authorization: Bearer ck_test_<your-api-key>
```

## Response Format

### Success
```json
{
  "data": { ... },
  "requestId": "req_..."
}
```

### Error
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "requestId": "req_..."
  }
}
```

---

## Endpoints

### Health

#### `GET /v1/health`
Returns API liveness status. No authentication required.

**Response** `200 OK`
```json
{
  "status": "ok",
  "service": "chainkit-api",
  "timestamp": "2026-10-14T10:00:00.000Z"
}
```

#### `GET /v1/health/ready`
Returns readiness status including database connectivity.

---

### Projects

#### `POST /v1/projects`
Create a new project with an auto-generated sandbox API key.

**Request Body**
```json
{
  "name": "My Project"
}
```

**Response** `201 Created`
```json
{
  "data": {
    "project": {
      "id": "clx...",
      "name": "My Project",
      "createdAt": "2026-10-14T10:00:00.000Z"
    },
    "apiKey": "ck_test_..." 
  },
  "requestId": "req_..."
}
```

> ⚠️ The `apiKey` value is shown **only once**. Store it securely.

#### `GET /v1/projects/:projectId`
Get project details (requires authentication, scoped to project).

---

### API Keys

#### `POST /v1/projects/:projectId/api-keys`
Create a new API key for the project.

**Request Body**
```json
{
  "environment": "sandbox"
}
```

**Response** `201 Created` — includes the full key (shown once).

#### `GET /v1/projects/:projectId/api-keys`
List API keys (secrets are never returned, only prefixes).

#### `DELETE /v1/projects/:projectId/api-keys/:keyId`
Revoke an API key immediately.

#### `POST /v1/projects/:projectId/api-keys/:keyId/rotate`
Revoke the current key and create a new one atomically.

---

### Records

#### `POST /v1/records`
Create a new record and anchor its content hash on-chain.

**Headers**
- `Idempotency-Key: <unique-uuid>` (recommended)

**Request Body**
```json
{
  "type": "certificate",
  "externalId": "CERT-1024",
  "content": {
    "course": "Example Course",
    "issuedAt": "2026-10-14"
  }
}
```

Or with precomputed hash:
```json
{
  "type": "document",
  "externalId": "DOC-001",
  "contentHash": "a1b2c3d4e5f6..."
}
```

**Response** `202 Accepted`
```json
{
  "data": {
    "recordId": "rec_...",
    "transactionId": "txn_...",
    "transactionHash": "0x...",
    "contentHash": "a1b2c3...",
    "status": "pending",
    "createdAt": "2026-10-14T10:00:00.000Z"
  },
  "requestId": "req_..."
}
```

#### `GET /v1/records/:recordId`
Get record metadata and current status.

#### `GET /v1/records`
List records for the authenticated project.

**Query Parameters**
- `page` (default: 1)
- `limit` (default: 20, max: 100)

#### `POST /v1/records/:recordId/verify`
Verify content against the anchored hash.

**Request Body**
```json
{
  "content": {
    "course": "Example Course",
    "issuedAt": "2026-10-14"
  }
}
```

**Response** `200 OK`
```json
{
  "data": {
    "recordId": "rec_...",
    "verified": true,
    "status": "confirmed",
    "reason": "HASH_MATCH"
  },
  "requestId": "req_..."
}
```

---

### Transactions

#### `GET /v1/transactions/:transactionId`
Get transaction status and blockchain details.

**Response** `200 OK`
```json
{
  "data": {
    "id": "txn_...",
    "recordId": "rec_...",
    "transactionHash": "0x...",
    "chainId": 11155111,
    "status": "confirmed",
    "submittedAt": "2026-10-14T10:00:01.000Z",
    "confirmedAt": "2026-10-14T10:00:30.000Z"
  },
  "requestId": "req_..."
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid input |
| `INVALID_API_KEY` | 401 | Missing, invalid, or revoked key |
| `SCOPE_DENIED` | 403 | Key lacks required permission |
| `NOT_FOUND` | 404 | Resource not found in this project |
| `IDEMPOTENCY_CONFLICT` | 409 | Same key, different payload |
| `RATE_LIMITED` | 429 | Quota exceeded |
| `RPC_PROVIDER_ERROR` | 502 | Blockchain provider failure |
| `SERVICE_UNAVAILABLE` | 503 | Dependency unavailable |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

## Rate Limits

- **100 requests per minute** per API key
- `Retry-After` header included in 429 responses
