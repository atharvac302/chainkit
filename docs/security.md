# ChainKit Security Guide

## Threat Model

| Threat | Control |
|--------|---------|
| API key theft | One-time display, rotation/revocation, server-side storage, log redaction, quotas |
| Cross-tenant data access | Project ownership checks in every query; automated authorization tests |
| Replay/duplicate submission | Idempotency keys and database uniqueness constraints |
| RPC/provider outage | Adapter, timeout, retry policy, status reconciliation, provider monitoring |
| Malicious payload / resource abuse | Schema validation, size limits, rate limits, request budgets |
| AI-generated insecure code | Pinned SDK, curated examples, tests, human review, least-privilege tools |
| Private key compromise | Managed secret store/KMS, restricted relayer, low testnet balance, no keys in repo |
| Sensitive data permanence | Hash only; data minimization; privacy warning and retention policy |
| Contract vulnerability | Small contract, automated tests, static analysis, review before production |
| Supply-chain compromise | Lockfile, dependency scanning, CI checks, pinned versions |

## Security Rules

### API Keys
- Generate at least 256 bits of cryptographically secure random material
- Use distinct prefixes: `ck_test_` (sandbox), `ck_live_` (production)
- Show secret **once** at creation; store only a one-way hash
- Validate key, status, environment, scopes, and project on every request
- Support immediate revocation and rotation
- Redact all authorization headers from logs

### Data On-Chain
- **NEVER** put personal data, documents, names, emails, or IDs on-chain
- Only cryptographic hashes are anchored
- Original data stays in the customer's application

### Environment Separation
- Sandbox keys point only to testnet configuration
- Production activation requires separate credentials and approval
- Never mix sandbox and production credentials

### Secrets Management
- Never commit `.env` files, API keys, private keys, or seed phrases to Git
- Use the host's secret manager in deployed environments
- Relayer keys are testnet-only and must never be exposed

### Logging
- Never log API secrets, private keys, authorization headers, or seed phrases
- Redact key-like strings from error reporting
- Log only: request ID, project ID, route, response code, duration, sanitized error code

## Production Checklist

- [ ] All tests pass (contract, API, SDK, E2E)
- [ ] No secrets in repository or build output
- [ ] CORS allowlisted (not wildcarded)
- [ ] Body size limits configured
- [ ] Rate limits active
- [ ] API errors don't include stack traces
- [ ] Key rotation/revocation takes effect immediately
- [ ] No customer payloads in logs or on-chain
- [ ] npm dependencies scanned and lockfile committed
- [ ] Contract reviewed before production deployment
- [ ] Incident runbook exists for: RPC outage, stuck transactions, leaked key
