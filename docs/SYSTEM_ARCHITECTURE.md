# InterPredict V2 — System Architecture

> Version: 2.0.0
> Date: 2026-08-16
> Status: DRAFT (Phase Zero)

---

## 1. Architectural Principle

InterPredict V2 uses a **chain-authoritative, database-indexed** architecture. The InterLink EVM chain is the single source of truth for market state. A dedicated indexer consumes chain events and materializes a query-optimized read model in Supabase PostgreSQL. The frontend reads exclusively from PostgreSQL via typed APIs — never reconstructing state from RPC calls at request time.

```
                     ┌─────────────────────┐
                     │ InterLink EVM Chain │
                     └──────────┬──────────┘
                                │  events / authoritative state
                                ▼
                  ┌─────────────────────────┐
                  │ Blockchain Synchronizer │
                  │ / Indexer               │
                  └────────────┬────────────┘
                               │  transactional upserts
                               ▼
                  ┌─────────────────────────┐
                  │ Supabase PostgreSQL     │
                  │ Indexed Read Model      │
                  └────────────┬────────────┘
                               │  optimized queries
                               ▼
                  ┌─────────────────────────┐
                  │ Next.js Backend APIs     │
                  └────────────┬────────────┘
                               │
                               ▼
                  ┌─────────────────────────┐
                  │ Next.js Frontend         │
                  └─────────────────────────┘
```

---

## 2. Read Path (normal browsing)

```
Browser → API → PostgreSQL → Response
```

- Zero full-chain scans.
- Zero per-market RPC fan-out.
- Pagination, filtering, sorting, selective columns.

---

## 3. Write Path (state change)

```
User → UI → Wallet signature → Smart contract → Transaction confirmation
  → Targeted synchronization → PostgreSQL read model
  → Query invalidation/refetch → Updated UI
```

---

## 4. Layer Responsibilities

| Layer | Responsibility | Key modules |
|-------|---------------|-------------|
| Chain | Authoritative market state, events | `contracts/InterPredictV2.sol` |
| Indexer | Event consumption, transactional upserts, checkpoints | `services/indexer/` |
| Database | Query-optimized read model, provenance, RLS | `supabase/migrations/` |
| Repositories | Typed data access, no N+1 | `repositories/` |
| Services | Domain logic, wallet, auth, blockchain interaction | `services/` |
| APIs | Typed, validated, enveloped endpoints | `app/api/` |
| Frontend | React components, design system, i18n, theme | `app/`, `components/`, `hooks/` |

---

## 5. Separation of Concerns

- **UI** (`components/`, `app/`) — presentation only.
- **Domain logic** (`lib/`, `services/`) — action engine, state rules.
- **Blockchain interaction** (`services/blockchain/`) — contract calls, receipts.
- **Database access** (`repositories/`) — Supabase queries.
- **Synchronization** (`services/indexer/`) — event indexing.
- **API logic** (`app/api/`) — validation, envelope, auth.
- **Wallet interaction** (`services/wallet/`) — connect, sign, send.
- **Configuration** (`lib/config/`) — typed env, no magic numbers.

---

## 6. Data Ownership

The chain is authoritative for all market state. PostgreSQL is a derived read model. See `DATA_OWNERSHIP.md` for the field-by-field matrix. Reconciliation is possible via provenance columns on every chain-derived row.

---

## 7. Failure Isolation

- RPC failure → indexer retries with backoff; never corrupts DB.
- DB failure → indexer does not advance checkpoint.
- API failure → frontend shows distinct error state (not "no data").
- Indexer lag → frontend shows "indexer behind" state, not stale data silently.

---

## 8. Non-Goals

- No request-time chain reconstruction.
- No `snapshot.json`-style single-blob cache.
- No per-market RPC fan-out on the read path.
- No Mainnet deployment (testnet only).