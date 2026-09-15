# InterPredict V2 — Security Model

> Version: 2.0.0
> Date: 2026-08-16
> Status: DRAFT (Phase Zero)

---

## 1. Trust Boundaries

```
Browser (untrusted) → API (trusted boundary) → PostgreSQL (trusted)
                    → RPC gateway (authenticated)
                    → Smart contract (authoritative)
```

- The browser is untrusted; all input is validated server-side.
- The API is the enforcement point for authorization.
- The indexer is the only writer of chain-derived data.

---

## 2. Secret Management

| Category | Examples | Handling |
|----------|----------|----------|
| Public config | `NEXT_PUBLIC_CONTRACT_ADDRESS`, chain ID, RPC URL | Safe for browser |
| Server secrets | `SUPABASE_SECRET_KEY`, `SERVICE_WALLET_PRIVATE_KEY`, `INDEXER_SECRET`, `CRON_SECRET` | Server-only, never `NEXT_PUBLIC_*` |

- Fail startup/deployment when required secrets are missing (no unsafe defaults).
- Never log secrets.

---

## 3. Contract Security

- ReentrancyGuard on value-transfer functions.
- Checks-Effects-Interactions ordering.
- AccessControl for privileged actions.
- Pausable emergency stop.
- Custom errors (no opaque reverts).
- No delegatecall/selfdestruct/upgradeability (no storage collisions).
- Bounded loops (no unbounded DEC-list iteration).
- Pull-based payments (claim pattern).

---

## 4. Database Security

- Row Level Security (RLS) on all tables.
- Least-privilege PostgreSQL grants.
- Server-only service role for indexer/API.
- No Supabase service/secret key in browser code.

---

## 5. API Security

- Server-side input validation (zod schemas).
- Rate limiting on sync/upload/report/admin routes.
- Admin routes use proper authorization (not obscure URLs).
- `POST /api/indexer/refresh` requires `INDEXER_SECRET`.
- Standard error envelope (no stack traces to clients).

---

## 6. RPC Authentication

- InterLink RPC requires Bearer auth (challenge/verify/refresh).
- Client wallet auth: per-user tokens (localStorage, lowercase-keyed).
- Server service-wallet auth: `SERVICE_WALLET_PRIVATE_KEY`.
- Tokens never exposed to browser beyond the authenticated client flow.

---

## 7. Upload Handling

- Validate MIME type and size.
- Store binary in object storage (not PostgreSQL).
- Reject non-image content.

---

## 8. Security Headers

- CSP (compatible with wallet integrations).
- Frame protection (`X-Frame-Options` / `frame-ancestors`).
- MIME protections (`X-Content-Type-Options: nosniff`).
- Referrer policy.
- Permissions policy.

---

## 9. Frontend Leakage Prevention

- No secrets in client bundles.
- No private keys, seed phrases, or auth tokens collected in issue reports.
- Wallet secrets never persisted.

---

## 10. Review Gate

Before production recommendation, a final internal security review covers: contracts, permissions, API authorization, secrets, RLS, RPC auth, uploads, admin routes, dependency vulnerabilities, frontend leakage.

Internal automated review does **not** replace an independent professional audit for high-risk production contracts.