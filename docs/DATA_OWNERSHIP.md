# InterPredict V2 — Data Ownership

> Version: 2.0.0
> Date: 2026-08-16
> Status: DRAFT (Phase Zero)

---

## 1. Principle

The InterLink EVM chain is the **authoritative source** for all market state. Supabase PostgreSQL is a **derived read model**. The frontend never treats its own state, the database, or the chain as interchangeable without reconciliation.

For every important field, this document defines:
- **Authoritative Source** — where the canonical value lives.
- **DB Copy** — whether PostgreSQL stores a copy.
- **Update Trigger** — what causes the DB copy to update.

---

## 2. Field Ownership Matrix

| Field | Authoritative Source | DB Copy | Update Trigger |
|-------|---------------------|---------|----------------|
| market ID | Chain | Yes | `MarketProposed` / `MarketDeployed` event |
| creator | Chain | Yes | creation event |
| question | Chain (creation) | Yes | creation event |
| description | Chain (creation) | Yes | creation event |
| category | Chain (creation) | Yes | creation event |
| custom category | Chain (creation) | Yes | creation event |
| origin (community/team) | Chain | Yes | creation event |
| state | Chain | Yes | state-transition event |
| outcomes (labels) | Chain (creation) | Yes | creation event |
| outcome pools | Chain | Yes | `ParticipationRecorded` event |
| outcome prices | Derived (chain pools) | Yes | recomputed on participation |
| end time | Chain (creation) | Yes | creation event |
| resolution criteria | Chain (creation) | Yes | creation event |
| thumbnail | Metadata storage (object storage) | URL only | metadata update |
| total volume | Chain | Yes | `ParticipationRecorded` event |
| participant count | Chain | Yes | `ParticipationRecorded` event |
| proposal votes | Chain | Yes | `ProposalVoteCast` event |
| resolution votes | Chain | Yes | `ResolutionVoteCast` event |
| confirmed outcome | Chain | Yes | `OutcomeConfirmed` event |
| finalized flag | Chain | Yes | `MarketFinalized` event |
| user activity | Chain | Yes | participation/vote/claim events |
| user shares | Chain | Yes | `ParticipationRecorded` event |
| claimed flags | Chain | Yes | claim events |
| transaction hash | Chain | Yes | confirmation |
| DEC membership | Chain | Yes | DEC member events |
| DEC reputation | Chain | Yes | `ReputationUpdated` event |
| DEC rewards | Chain | Yes | reward events |

---

## 3. Provenance

Every chain-derived row in PostgreSQL carries:

```
chain_id
contract_address
block_number
block_hash
transaction_hash
log_index
indexed_at
created_at
updated_at
```

This enables reconciliation: any DB row can be traced back to the exact chain event that produced it.

---

## 4. Reconciliation Rules

1. The indexer is the **only** writer of chain-derived data.
2. If the indexer cannot decode/validate an event, it records a `sync_failure` and does **not** write partial data.
3. If a DB row disagrees with the chain, the chain wins; the indexer re-syncs the affected range.
4. The frontend never writes chain-derived fields directly.

---

## 5. Non-Chain Data

Some data is **not** chain-derived and lives only in PostgreSQL or object storage:

| Field | Source | Notes |
|-------|--------|-------|
| thumbnail binary | Object storage | URL stored in DB |
| issue reports | PostgreSQL | User-submitted |
| supported locales | PostgreSQL | Config |
| categories (display metadata) | PostgreSQL | Data-driven |

---

## 6. Address Normalization

All EVM addresses are normalized to **lowercase** before storage and comparison. Never depend on case-sensitive wallet comparison (fixes the "My Votes missing" beta defect).