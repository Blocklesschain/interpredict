# InterPredict V2 — Database Schema

> Version: 2.0.0
> Date: 2026-08-16
> Status: DRAFT (Phase Zero)

---

## 1. Overview

Supabase PostgreSQL is the **query-optimized read model**. The chain is authoritative; the indexer materializes chain events into these tables. All chain-derived rows carry provenance columns.

---

## 2. Tables

### markets
| Column | Type | Notes |
|--------|------|-------|
| id | bigint PK | market ID (chain) |
| question | text | |
| description | text | |
| category | smallint | enum index |
| custom_category | text | nullable |
| origin | smallint | 0=community, 1=team |
| creator | text | lowercase address |
| state | smallint | enum index |
| end_time | bigint | unix seconds |
| resolution_criteria | text | |
| thumbnail_url | text | nullable |
| total_volume | numeric(78,0) | wei |
| participant_count | integer | |
| confirmed_outcome | smallint | nullable |
| finalized | boolean | |
| cancelled | boolean | |
| cancel_reason | text | nullable |
| + provenance columns | | |

### market_outcomes
| Column | Type | Notes |
|--------|------|-------|
| market_id | bigint FK | |
| outcome_index | smallint | |
| label | text | |
| pool | numeric(78,0) | wei |
| price | numeric(38,18) | 1e18-scaled |
| PK (market_id, outcome_index) | | |

### market_state_history
| Column | Type | Notes |
|--------|------|-------|
| market_id | bigint FK | |
| from_state | smallint | |
| to_state | smallint | |
| block_number | bigint | |
| transaction_hash | text | |
| log_index | integer | |
| indexed_at | timestamptz | |

### participations
| Column | Type | Notes |
|--------|------|-------|
| market_id | bigint FK | |
| participant | text | lowercase address |
| outcome_index | smallint | |
| gross | numeric(78,0) | |
| net | numeric(78,0) | |
| shares | numeric(78,0) | |
| fee | numeric(78,0) | |
| claimed | boolean | |
| + provenance | | |
| UNIQUE (market_id, participant, outcome_index) | | |

### proposal_votes
| Column | Type | Notes |
|--------|------|-------|
| market_id | bigint FK | |
| voter | text | lowercase |
| vote | smallint | 1=approve, 2=reject |
| + provenance | | |
| UNIQUE (market_id, voter) | | |

### resolution_requests
| Column | Type | Notes |
|--------|------|-------|
| market_id | bigint FK | |
| requester | text | lowercase |
| deadline | bigint | |
| + provenance | | |

### resolution_votes
| Column | Type | Notes |
|--------|------|-------|
| market_id | bigint FK | |
| voter | text | lowercase |
| outcome_index | smallint | |
| + provenance | | |
| UNIQUE (market_id, voter) | | |

### dec_members
| Column | Type | Notes |
|--------|------|-------|
| address | text PK | lowercase |
| active | boolean | |
| reputation | integer | |
| proposal_votes | integer | |
| resolution_votes | integer | |
| honest_votes | integer | |
| incorrect_votes | integer | |
| total_rewards_earned | numeric(78,0) | |
| total_rewards_claimed | numeric(78,0) | |
| unclaimed_rewards | numeric(78,0) | |
| + provenance | | |

### transactions
| Column | Type | Notes |
|--------|------|-------|
| hash | text PK | |
| block_number | bigint | |
| from_address | text | lowercase |
| to_address | text | lowercase |
| method | text | |
| status | smallint | 1=success, 0=revert |
| indexed_at | timestamptz | |

### sync_checkpoints
| Column | Type | Notes |
|--------|------|-------|
| chain_id | text PK | |
| contract_address | text | |
| last_processed_block | bigint | |
| last_processed_block_hash | text | |
| last_successful_sync_at | timestamptz | |
| sync_status | text | |
| last_error | text | nullable |

### sync_failures
| Column | Type | Notes |
|--------|------|-------|
| id | bigserial PK | |
| block_number | bigint | |
| transaction_hash | text | |
| log_index | integer | |
| error | text | |
| retry_count | integer | |
| created_at | timestamptz | |

### categories
| Column | Type | Notes |
|--------|------|-------|
| id | smallint PK | enum index |
| key | text | |
| label_key | text | i18n key |

### supported_locales
| Column | Type | Notes |
|--------|------|-------|
| code | text PK | e.g. en, zh, es, fr |
| enabled | boolean | |

---

## 3. Provenance Columns (chain-derived tables)

```
chain_id text
contract_address text
block_number bigint
block_hash text
transaction_hash text
log_index integer
indexed_at timestamptz
created_at timestamptz
updated_at timestamptz
```

---

## 4. Indexes

| Table | Index | Type |
|-------|-------|------|
| markets | (state) | btree |
| markets | (creator) | btree |
| markets | (category) | btree |
| markets | (end_time) | btree |
| markets | (created_at) | btree |
| participations | (participant) | btree |
| participations | (market_id, participant) | unique |
| proposal_votes | (market_id, voter) | unique |
| resolution_votes | (market_id, voter) | unique |
| transactions | (block_number) | btree |
| transactions | (from_address) | btree |
| sync_checkpoints | (chain_id) | pk |

Composite indexes added where `EXPLAIN ANALYZE` justifies them.

---

## 5. Security

- Row Level Security (RLS) enabled on all tables.
- Server-only service role for the indexer and API.
- No `anon` key access to chain-derived tables.
- No Supabase service/secret key in browser code.

---

## 6. Idempotency

- `participations`: UNIQUE (market_id, participant, outcome_index).
- `proposal_votes`: UNIQUE (market_id, voter).
- `resolution_votes`: UNIQUE (market_id, voter).
- `transactions`: PK (hash).
- Indexer uses `ON CONFLICT DO UPDATE` upserts keyed on `chain_id + transaction_hash + log_index`.