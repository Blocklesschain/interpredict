# InterPredict V2 — Deployment

> Version: 2.0.0
> Date: 2026-08-16
> Status: DRAFT (Phase Zero)

---

## 1. Environments

```
local
development
preview
testnet
production
```

Configuration must not mix environments. Testnet contract configuration must never silently become production configuration.

---

## 2. Deployment Process

**Do not deploy automatically.** Before deployment, provide:

```
BUILD STATUS
TEST STATUS
SECURITY STATUS
DATABASE MIGRATION STATUS
CONTRACT STATUS
INDEXER STATUS
ENVIRONMENT STATUS
KNOWN ISSUES
ROLLBACK PROCEDURE
```

Ask for explicit approval before deploying.

---

## 3. Contract Deployment

Before any contract deployment, provide:

- compiler version
- optimizer settings
- constructor arguments
- expected contract address workflow
- network
- deployment account requirements
- verification instructions
- ABI generation process
- frontend configuration changes
- rollback/migration implications

Do not deploy without explicit approval. **No Mainnet deployment.**

---

## 4. Database Migration Safety

Every production migration reviewed for:
- destructive operations
- locks
- backwards compatibility
- rollback

Prefer additive migrations during rollout.

---

## 5. Zero-Downtime Data Migration

```
Phase A: Deploy database/indexer
Phase B: Backfill
Phase C: Validate parity
Phase D: Enable DB read API
Phase E: Switch frontend reads
Phase F: Monitor
Phase G: Remove obsolete code only after confidence period
```

---

## 6. Parity Validation

Before switching reads, compare sampled records:

```
chain vs database vs API vs UI
```

Verify: ID, state, creator, outcomes, timestamps, activity. Produce a parity report.

---

## 7. Netlify Configuration

- Build command: `pnpm run build`.
- Publish: `.next`.
- `@netlify/plugin-nextjs` plugin.
- Background/scheduled function for the indexer.
- Environment variables per ENVIRONMENT_VARIABLES.md.

---

## 8. Supabase Setup

- Apply migrations from `supabase/migrations/`.
- Configure RLS, grants, service role.
- See DATABASE_SCHEMA.md and MIGRATION_STRATEGY.md.

---

## 9. Release Readiness

Generate `docs/RELEASE_READINESS.md` with a requirement → implementation → test → status → evidence matrix. Critical requirements may not be FAIL/BLOCKED/NOT IMPLEMENTED for release approval.