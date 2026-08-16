# InterPredict V2 — Indexer Architecture

> Version: 2.0.0
> Date: 2026-08-16
> Status: DRAFT (Phase Zero)

---

## 1. Overview

The indexer is a dedicated synchronization layer that consumes InterLink chain events and materializes them into Supabase PostgreSQL. It is:

- **Incremental** — processes only new blocks since the last checkpoint.
- **Resumable** — restarts from the checkpoint after a crash.
- **Idempotent** — reprocessing an event does not duplicate records.
- **Observable** — structured logs + `sync_checkpoints`/`sync_failures` tables.
- **Retry-safe** — RPC failures retried with backoff; checkpoint not advanced on failure.

---

## 2. Synchronization Loop

```
Read checkpoint
  ↓
Determine safe confirmed block (latest - confirmation_depth)
  ↓
Determine missing range
  ↓
Read bounded range (eth_getLogs)
  ↓
Decode relevant events
  ↓
Validate
  ↓
Upsert transactionally
  ↓
Commit
  ↓
Advance checkpoint
```

If persistence fails: **DO NOT ADVANCE THE CHECKPOINT.**

---

## 3. Checkpoint State (`sync_checkpoints`)

```
chain_id
contract_address
last_processed_block
last_processed_block_hash
last_successful_sync_at
sync_status
last_error
```

---

## 4. Idempotency

- Uniqueness key: `chain_id + transaction_hash + log_index`.
- Upserts use `ON CONFLICT DO UPDATE`.
- Reprocessing a block produces identical DB state.

---

## 5. RPC Failure Handling

Handle: 429/rate limiting, 500 errors, network timeout, malformed response, unavailable RPC, expired authentication, partial batch failure.

Strategy:
- Bounded concurrency.
- Exponential backoff + jitter.
- Maximum retries.
- Structured logging.
- **Never** convert an RPC failure into legitimate-looking `0`/`[]`/`""`/`false` and overwrite good data.

---

## 6. Event → Table Mapping

| Event | Tables updated |
|-------|----------------|
| `MarketProposed` / `MarketDeployed` | markets, market_outcomes, market_state_history |
| `MarketActivated` / `MarketApproved` / `MarketRejected` / `MarketCancelled` | markets (state), market_state_history |
| `ParticipationRecorded` | participations, markets (volume/participants), market_outcomes (pool/price) |
| `ProposalVoteCast` | proposal_votes |
| `ResolutionRequested` | resolution_requests, markets (state) |
| `ResolutionVoteCast` | resolution_votes |
| `OutcomeConfirmed` | markets (confirmed_outcome) |
| `MarketFinalized` | markets (finalized) |
| `WinningsClaimed` / `CreatorFeeClaimed` / `CreatorSeedClaimed` | participations (claimed), markets |
| `DECMemberJoined` / `Removed` / `Activated` / `Suspended` | dec_members |
| `ReputationUpdated` | dec_members (reputation) |
| `DECRewardClaimed` | dec_members (rewards) |

---

## 7. Deployment Model

Preferred: **Netlify Background Function** (or scheduled function) that runs the indexer independently of page requests.

```
Netlify Background Function → Indexer → Supabase
```

A normal request is:

```
Browser → API → PostgreSQL → Response
```

NOT `Browser → API → Blockchain scan → wait`.

---

## 8. Targeted Reconciliation

After a confirmed state-changing transaction:

```
receipt → affected market/entity IDs → targeted sync → DB update
  → invalidate relevant frontend queries → updated UI
```

No full rescan when one record changes.

---

## 9. Backfill

Historical backfill (if existing testnet data must appear) uses a dedicated script, not request handling. Backfill is resumable, observable, idempotent.

---

## 10. Observability

Indexer logs include:

```
start_block, end_block, events_processed, records_upserted,
retry_count, duration, checkpoint
```

Never log secrets.