# ChainKit Quickstart Guide

Get from zero to a working blockchain-anchored record in under 15 minutes.

## Prerequisites

- Node.js 20+ and npm 10+
- PostgreSQL running locally (or via Docker)
- A Sepolia testnet RPC URL (free from [Alchemy](https://alchemy.com) or [Infura](https://infura.io))
- A testnet wallet with Sepolia ETH ([faucet](https://sepoliafaucet.com))

## Step 1: Set up ChainKit

```bash
# Clone and install
git clone <repo-url> chainkit && cd chainkit
npm install

# Configure environment
cp .env.example .env
# Edit .env: set DATABASE_URL, RPC_URL, DEPLOYER_PRIVATE_KEY, RELAYER_PRIVATE_KEY
```

## Step 2: Initialize the database

```bash
cd apps/api
npx prisma migrate dev --name init
cd ../..
```

## Step 3: Deploy the smart contract

```bash
npm run deploy:sepolia -w packages/contracts
# Output: RecordRegistry deployed at 0x...
# Copy the address to RECORD_REGISTRY_ADDRESS in .env
```

## Step 4: Start the API

```bash
npm run dev:api
# API running at http://localhost:3001
# Swagger docs at http://localhost:3001/docs
```

## Step 5: Create a project and API key

```bash
# Create a project
curl -X POST http://localhost:3001/v1/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "My First Project"}'

# Response includes a sandbox API key — save it!
# { "data": { "project": {...}, "apiKey": "ck_test_..." } }
```

## Step 6: Anchor a record

```bash
export API_KEY="ck_test_<your-key>"

curl -X POST http://localhost:3001/v1/records \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(uuidgen)" \
  -d '{
    "type": "certificate",
    "externalId": "CERT-001",
    "content": {
      "student": "Alice",
      "course": "Blockchain Fundamentals",
      "grade": "A",
      "issuedAt": "2026-10-14"
    }
  }'

# Response: { "data": { "recordId": "rec_...", "status": "pending", ... } }
```

## Step 7: Check transaction status

```bash
curl http://localhost:3001/v1/records/<recordId> \
  -H "Authorization: Bearer $API_KEY"

# Wait for status to change from "pending" to "confirmed"
```

## Step 8: Verify the content

```bash
# Original content — should return verified: true
curl -X POST http://localhost:3001/v1/records/<recordId>/verify \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": {
      "student": "Alice",
      "course": "Blockchain Fundamentals",
      "grade": "A",
      "issuedAt": "2026-10-14"
    }
  }'

# Tampered content — should return verified: false
curl -X POST http://localhost:3001/v1/records/<recordId>/verify \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "content": {
      "student": "Alice",
      "course": "Blockchain Fundamentals",
      "grade": "A+",
      "issuedAt": "2026-10-14"
    }
  }'
```

## Step 9: Use the SDK (optional)

```bash
# In your own project
npm install @chainkit/sdk
```

```typescript
import { ChainKit } from '@chainkit/sdk';

const client = new ChainKit({
  apiKey: process.env.CHAINKIT_API_KEY!,
  baseUrl: 'http://localhost:3001',
});

const record = await client.records.create({
  type: 'certificate',
  externalId: 'CERT-002',
  content: { student: 'Bob', course: 'Web3 101' },
});

const verification = await client.records.verify(record.recordId, {
  content: { student: 'Bob', course: 'Web3 101' },
});

console.log(verification.verified); // true
```

## Step 10: Start the dashboard (optional)

```bash
npm run dev:dashboard
# Open http://localhost:3000
```

## What's happening under the hood?

1. Your content is **canonicalized** (deterministic JSON with sorted keys)
2. A **SHA-256 hash** is computed from the canonical JSON
3. The hash is sent to the **RecordRegistry** smart contract on Sepolia
4. The contract stores the hash and emits a **RecordAnchored** event
5. When you verify, the same canonicalization + hashing is applied
6. The result is compared against the on-chain hash — any change returns `false`

> **Important**: Only the hash goes on-chain. Your actual data stays in your application.
