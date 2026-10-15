# ⛓️ ChainKit

> **Blockchain-as-a-Service (BaaS) for Modern Developers**  
> Anchor, notarize, and verify tamper-evident data on EVM blockchains without managing gas fees, private keys, or Web3 wallets.

[![Tests](https://img.shields.io/badge/tests-108%20passed-success)](https://github.com/atharvac302/chainkit)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-lightgrey)](https://soliditylang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 💡 Why ChainKit?

Most applications need trust and auditability—diplomas, invoices, supply-chain receipts, legal agreements, and compliance logs. But integrating directly with blockchains today requires:
- Managing gas fees and fluctuations
- Safely storing raw private keys in microservices
- Writing and auditing custom Solidity contracts
- Debugging nonce collisions and re-orgs

**ChainKit solves this by acting as an abstraction layer.** Your backend makes a standard REST call or SDK call with an API key, and ChainKit canonicalizes the payload, calculates a SHA-256 fingerprint, sponsors the testnet gas, anchors the hash to an EVM contract, and tracks receipt status.

> 🔒 **Privacy by Design:** Raw documents and confidential payloads are **never** broadcast to the public blockchain. Only 32-byte cryptographic digests are anchored.

---

## 🏗️ System Architecture

```text
  Developer Application / AI Assistant
                 │
                 ▼
       ┌──────────────────┐
       │  @chainkit/sdk   │  (TypeScript Client)
       └─────────┬────────┘
                 │  REST API (Bearer ck_test_...)
                 ▼
       ┌──────────────────┐
       │   apps/api       │  Fastify REST Service
       │                  │  - HMAC-SHA256 API Key Auth
       │                  │  - Deterministic JSON Canonicalizer
       │                  │  - Idempotency & Rate Limiting
       └────┬────────┬────┘
            │        │
   Off-Chain│        │On-Chain (Viem Adapter)
            ▼        ▼
       ┌────────┐  ┌───────────────────────────────────┐
       │ SQLite │  │ RecordRegistry.sol (Sepolia EVM)  │
       │ Prisma │  │ - Immutable Hash Anchoring        │
       └────────┘  │ - Event Attestation & Queries     │
                   └───────────────────────────────────┘
```

---

## 📦 Monorepo Packages

This repository is structured as an npm monorepo (`workspaces`):

| Package | Directory | Description |
| :--- | :--- | :--- |
| **`@chainkit/contracts`** | [`packages/contracts`](./packages/contracts) | Solidity 0.8.24 registry, Hardhat config, deployment scripts, 13 test suites |
| **`@chainkit/shared`** | [`packages/shared`](./packages/shared) | Shared Zod schemas, canonicalization utils, standardized error codes |
| **`@chainkit/sdk`** | [`packages/sdk-typescript`](./packages/sdk-typescript) | Isomorphic TypeScript client for records & transactions |
| **`@chainkit/cli`** | [`packages/cli`](./packages/cli) | Developer scaffolding CLI (`chainkit init`, `doctor`, `example`) |
| **`@chainkit/agent-skill`**| [`packages/agent-skill`](./packages/agent-skill) | Machine-readable AI agent integration skill instructions |
| **`@chainkit/api`** | [`apps/api`](./apps/api) | Production Fastify backend with Viem blockchain adapter & Prisma ORM |
| **`@chainkit/dashboard`** | [`apps/dashboard`](./apps/dashboard) | Next.js 14 developer console (Tailwind CSS, high-contrast WCAG AAA) |

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: >= 20.0.0
- **npm**: >= 10.0.0

### 2. Installation
```bash
git clone https://github.com/atharvac302/chainkit.git
cd chainkit
npm install
```

### 3. Initialize Local Database
ChainKit defaults to a zero-configuration SQLite database (`dev.db`) for instant local testing:
```bash
npm run db:push -w apps/api
```

### 4. Run Development Servers
In your first terminal, start the Fastify API (port `3001`):
```bash
npm run dev:api
```

In a second terminal, start the Developer Dashboard (port `3000`):
```bash
npm run dev:dashboard
```

Visit **[http://localhost:3000](http://localhost:3000)** to explore your developer console!

---

## 💻 SDK Usage Example

Install the SDK in any TypeScript or JavaScript project:

```bash
npm install @chainkit/sdk
```

Anchor and verify records with zero blockchain boilerplate:

```typescript
import { ChainKit } from '@chainkit/sdk';

// Initialize client with your project API key
const chainkit = new ChainKit({
  apiKey: process.env.CHAINKIT_API_KEY!,
  baseUrl: 'http://localhost:3001',
});

// 1. Anchor a certificate or invoice
const record = await chainkit.records.create({
  type: 'academic_credential',
  externalId: 'STUDENT-2026-9901',
  content: {
    student: 'Jane Doe',
    major: 'Computer Science',
    graduationYear: 2026,
    honors: 'Summa Cum Laude',
  },
});

console.log('Record ID:', record.recordId);
console.log('Status:', record.status); // 'pending' -> 'confirmed'

// 2. Later, verify whether data has been tampered with
const result = await chainkit.records.verify(record.recordId, {
  content: {
    student: 'Jane Doe',
    major: 'Computer Science',
    graduationYear: 2026,
    honors: 'Summa Cum Laude',
  },
});

console.log('Authentic:', result.verified); // true
```

---

## 🧪 Testing Suite

ChainKit includes 108 comprehensive automated tests across all workspaces:

```bash
# Run all workspace test suites
npm test

# Or test individual modules:
npm run test:contracts   # Smart contract Hardhat tests (13 tests)
npm test -w packages/shared # Canonicalization & schema tests (59 tests)
npm run test:sdk         # TypeScript SDK tests (23 tests)
npm test -w packages/cli # CLI generator tests (6 tests)
npm run test:api         # Fastify API integration tests (7 tests)
```

---

## 🛡️ Security Principles

- **One-Way Credentials:** Raw API secrets are shown once upon creation and stored exclusively as HMAC-SHA256 hashes with high-entropy peppers.
- **Timing-Safe Checks:** All credential comparisons utilize `crypto.timingSafeEqual` to thwart timing attacks.
- **Log Sanitization:** Sensitive headers (`Authorization`, `Cookie`) and potential secret prefixes are redacted from Pino log streams.
- **Data Minimization:** No raw documents or personally identifiable information (PII) are ever broadcast on-chain.

---

## 📄 License

Distributed under the [MIT License](./LICENSE). See `LICENSE` for more information.
