# InterPredict V2 — Observability

> Version: 2.0.0
> Date: 2026-08-16
> Status: DRAFT (Phase Zero)

---

## 1. Structured Logging

All logs are structured JSON with:

```
request_id
correlation_id
operation
duration
status
```

Never log secrets.

---

## 2. Indexer Logs

Indexer logs include:

```
start_block
end_block
events_processed
records_upserted
retry_count
duration
checkpoint
```

---

## 3. Health Endpoint

`GET /api/health` returns:

```json
{
  "data": {
    "status": "ok",
    "database": "reachable",
    "indexer": {
      "status": "healthy",
      "lastSuccessfulSync": "...",
      "lag": "..."
    }
  }
}
```

No credentials or sensitive infrastructure details exposed.

---

## 4. Performance Metrics

Track:

```
API p50
API p95
DB query p95
page LCP
indexer lag
RPC failure rate
transaction-confirmation-to-UI-update delay
```

---

## 5. Sync State

`sync_checkpoints` and `sync_failures` tables provide durable sync state for debugging and reconciliation.

---

## 6. Error Tracking

- Central error normalization logs technical diagnostics (not shown to users).
- `sync_failures` records indexer errors with retry counts.