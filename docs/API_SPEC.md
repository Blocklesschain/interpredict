# InterPredict V2 — API Specification

> Version: 2.0.0
> Date: 2026-08-16
> Status: DRAFT (Phase Zero)

---

## 1. Standard Envelope

All responses use:

```json
{
  "data": {},
  "meta": {},
  "error": null
}
```

Errors contain safe machine-readable codes:

```json
{
  "data": null,
  "meta": {},
  "error": {
    "code": "INVALID_STATE",
    "message": "This action is not available for the market's current state."
  }
}
```

---

## 2. Error Codes

| Code | Meaning |
|------|---------|
| `USER_CANCELLED` | Wallet rejected the transaction |
| `RPC_RATE_LIMITED` | RPC gateway rate limited |
| `NETWORK_UNAVAILABLE` | RPC/network down |
| `INVALID_STATE` | Action not valid for current state |
| `ACTION_ALREADY_COMPLETED` | Duplicate action |
| `TRANSACTION_REVERTED` | On-chain revert |
| `INDEXING_DELAY` | Indexer behind |
| `WALLET_DISCONNECTED` | No wallet connected |
| `VALIDATION_ERROR` | Input failed schema |
| `UNAUTHORIZED` | Missing/invalid auth |
| `NOT_FOUND` | Resource not found |
| `UNKNOWN` | Unclassified |

---

## 3. Endpoints

### Markets
```
GET /api/markets
  Query: state, category, creator, page, pageSize, sort, order
  Response: { data: { markets: [...] }, meta: { page, pageSize, total, freshness } }

GET /api/markets/:id
  Response: { data: { market: {...} }, meta: { freshness } }
```

### Activity
```
GET /api/activity
  Query: page, pageSize
  Response: { data: { activity: [...] }, meta: { page, pageSize, total } }

GET /api/users/:wallet/activity
  Response: { data: { activity: [...] }, meta: { page, pageSize, total } }
```

### DEC
```
GET /api/dec
  Response: { data: { members: [...], threshold, pool } }

GET /api/dec/:wallet
  Response: { data: { member: {...} } }
```

### Health
```
GET /api/health
  Response: {
    data: {
      status: "ok",
      database: "reachable",
      indexer: { status: "healthy", lastSuccessfulSync, lag }
    }
  }
```

### Admin (authorized)
```
POST /api/indexer/refresh   (INDEXER_SECRET)
POST /api/indexer/backfill  (INDEXER_SECRET)
```

### Upload
```
POST /api/upload-thumbnail  (validated file type/size)
```

### Issue Reports
```
POST /api/issues  (rate-limited)
```

---

## 4. Pagination

- `page` (1-based), `pageSize` (default 20, max 100).
- `meta` returns `total` and `page`/`pageSize`.
- Never return unlimited datasets.

---

## 5. Validation

All untrusted input validated server-side via schemas (zod):
- IDs (numeric, positive)
- wallet addresses (checksummed → normalized lowercase)
- categories (enum)
- pagination (bounds)
- strings (length limits)
- uploaded files (MIME, size)
- query parameters

---

## 6. Freshness Metadata

Responses include `meta.freshness` with the indexer's last successful sync time and lag, so the frontend can distinguish "no data" from "indexer behind".

---

## 7. Rate Limiting

Protected endpoints:
- synchronization triggers
- upload endpoints
- issue reports
- administrative routes

---

## 8. Authorization

- Admin routes use proper authorization (not obscure URLs).
- `POST /api/indexer/refresh` requires `INDEXER_SECRET`.
- No Supabase service key in browser code.