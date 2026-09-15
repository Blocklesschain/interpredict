# InterPredict V2 — Threat Model

> Version: 2.0.0
> Date: 2026-08-16
> Status: DRAFT (Phase Zero)

---

## 1. Assets

| Asset | Sensitivity |
|-------|-------------|
| Market state (chain) | High — authoritative |
| PostgreSQL read model | High — derived, must reconcile |
| Service wallet private key | Critical |
| Supabase service key | Critical |
| Indexer secret | High |
| User wallet auth tokens | Medium |
| Thumbnail media | Low |
| Issue reports | Low (no secrets collected) |

---

## 2. Threat Actors

- Malicious user (browser).
- Compromised wallet.
- RPC gateway outage/compromise.
- Indexer crash/corruption.
- Database compromise.
- Dependency vulnerability.

---

## 3. Threats & Mitigations

### T1: Reentrancy on value-transfer functions
- **Mitigation:** ReentrancyGuard + CEI ordering.

### T2: Unauthorized privileged action
- **Mitigation:** AccessControl roles; admin routes require secrets.

### T3: Duplicate participation / votes / resolution requests
- **Mitigation:** Contract state checks + DB unique constraints.

### T4: RPC failure corrupting DB
- **Mitigation:** Indexer never writes `0`/`[]`/`""` on failure; checkpoint not advanced.

### T5: Indexer crash mid-batch
- **Mitigation:** Transactional upserts; checkpoint advanced only after commit.

### T6: Duplicate event reprocessing
- **Mitigation:** Idempotency key `chain_id + tx_hash + log_index`; `ON CONFLICT DO UPDATE`.

### T7: Secret leakage to browser
- **Mitigation:** No `NEXT_PUBLIC_*` secrets; server-only modules.

### T8: Unvalidated upload (malicious file)
- **Mitigation:** MIME/size validation; object storage isolation.

### T9: Rate-limit abuse of expensive endpoints
- **Mitigation:** Rate limiting on sync/upload/report/admin.

### T10: Admin route via obscure URL
- **Mitigation:** Proper authorization (INDEXER_SECRET), not URL obscurity.

### T11: Front-running / MEV on participation
- **Mitigation:** Documented as accepted testnet risk; no Mainnet deployment.

### T12: Unbounded loop DoS (DEC list)
- **Mitigation:** Bounded loops / pull-based reward distribution.

### T13: Dependency vulnerability
- **Mitigation:** CI dependency/security checks.

### T14: Stale cache showing wrong state
- **Mitigation:** Freshness metadata; indexer-lag state in UI.

---

## 4. Residual Risks

- Testnet-only deployment reduces financial impact but not correctness risk.
- Independent professional audit still required for high-risk production contracts.
- RPC gateway is a single point of failure (mitigated by retry/backoff, not eliminated).