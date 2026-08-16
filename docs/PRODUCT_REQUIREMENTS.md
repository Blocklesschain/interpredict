# InterPredict V2 — Product Requirements

> Version: 2.0.0
> Date: 2026-08-16
> Status: DRAFT (Phase Zero)

Every requirement receives a stable ID for traceability:
`Requirement → architecture → implementation → automated test → result`.

---

## 1. Product Objective

InterPredict is a production-quality, community-driven forecasting application for the InterLink EVM environment.

**Participation model (owner decision 2026-08-16):** Real-money mechanics using the **native ITL token**, deployed **on the testnet network only**. No Mainnet deployment.

The system supports:
1. Community-created forecasting markets
2. Multi-outcome questions (2–4 outcomes)
3. Market proposal workflow
4. Community curation through DEC
5. Market lifecycle management
6. Resolution requests
7. DEC resolution workflow
8. Transparent on-chain state
9. User participation records
10. Personal activity/history
11. Market discovery
12. Multilingual UI
13. Fast indexed reads
14. Reliable wallet interaction
15. Mobile-first experience
16. Administrative/operational monitoring

---

## 2. Functional Requirements

### Markets
- REQ-FUNC-001: Users can create a market proposal with a question, description, category, outcomes (2–4), end time, resolution criteria, and thumbnail.
- REQ-FUNC-002: Team members can deploy a market directly to Active.
- REQ-FUNC-003: Community proposals enter DEC review before activation.
- REQ-FUNC-004: Users can browse markets filtered by state and category.
- REQ-FUNC-005: Users can view a market detail page with full metadata.
- REQ-FUNC-006: Users can participate (place a testnet-ITL stake) on an outcome of an Active market.
- REQ-FUNC-007: Users can request resolution of an ended market (creator, trader, or active DEC member).
- REQ-FUNC-008: DEC members can vote on resolutions.
- REQ-FUNC-009: Admin verifiers can confirm the winning outcome and finalize markets.
- REQ-FUNC-010: Users can claim winnings, creator fees, and DEC rewards (testnet ITL).

### DEC
- REQ-FUNC-011: Users can apply for DEC membership.
- REQ-FUNC-012: Admin can approve/activate/suspend/remove DEC members.
- REQ-FUNC-013: DEC members can vote on proposals and resolutions.
- REQ-FUNC-014: Users can view DEC membership status and directory.

### Personal Activity
- REQ-FUNC-015: Users can view their participation history ("My Activity").
- REQ-FUNC-016: Activity is indexed deterministically from chain events (not RPC fan-out).

### Help / Support
- REQ-FUNC-017: A /help page explains market states, DEC, resolution, timestamps, transaction lifecycle, and common errors.
- REQ-FUNC-018: Users can submit issue reports (page, category, description) without exposing secrets.

---

## 3. Contract Requirements

- REQ-CONTRACT-001: Contract implements the full market lifecycle state machine.
- REQ-CONTRACT-002: Every state transition emits an indexable event with sufficient data for the indexer.
- REQ-CONTRACT-003: Contract uses custom errors (no opaque revert strings).
- REQ-CONTRACT-004: Contract uses OpenZeppelin AccessControl, ReentrancyGuard, Pausable.
- REQ-CONTRACT-005: No unbounded loops.
- REQ-CONTRACT-006: Duplicate actions are rejected (duplicate participation, duplicate votes, duplicate resolution requests).
- REQ-CONTRACT-007: Value transfer uses native ITL (testnet only).

---

## 4. Data Requirements

- REQ-DATA-001: PostgreSQL is the query-optimized read model.
- REQ-DATA-002: Chain-derived rows carry provenance (chain_id, contract_address, block_number, block_hash, transaction_hash, log_index, indexed_at).
- REQ-DATA-003: Wallet addresses are normalized to lowercase.
- REQ-DATA-004: Indexes exist for all query patterns (market id, state, creator, category, timestamps, wallet, tx hash, block).
- REQ-DATA-005: RLS enabled; server-only service key; no browser secrets.

---

## 5. Synchronization Requirements

- REQ-SYNC-001: Indexer is incremental, resumable, idempotent, observable, retry-safe.
- REQ-SYNC-002: Checkpoints are not advanced on persistence failure.
- REQ-SYNC-003: Idempotency key = chain_id + transaction_hash + log_index.
- REQ-SYNC-004: RPC failures use bounded concurrency, exponential backoff + jitter, max retries.
- REQ-SYNC-005: RPC failure never overwrites good data with 0/[]/""/false.
- REQ-SYNC-006: Targeted reconciliation after confirmed transactions (no full rescan).

---

## 6. API Requirements

- REQ-API-001: Standard envelope `{ data, meta, error }`.
- REQ-API-002: Machine-readable error codes.
- REQ-API-003: Pagination, filtering, sorting, selective columns.
- REQ-API-004: Server-side input validation via schemas.
- REQ-API-005: Rate limiting on sync/upload/report/admin routes.
- REQ-API-006: Health endpoint returns safe status (no credentials).

---

## 7. UX Requirements

- REQ-UX-001: Responsive market cards (Active/Upcoming/Closed/Resolved).
- REQ-UX-002: Data-driven categories (not hard-coded).
- REQ-UX-003: Resolution criteria visible before participation.
- REQ-UX-004: Guided market creation form with review screen.
- REQ-UX-005: UTC + local time shown before submission.
- REQ-UX-006: Dynamic action engine centralizes action availability.
- REQ-UX-007: Distinct empty/error/indexer-behind/no-activity states.
- REQ-UX-008: Accessible touch targets, keyboard nav, reduced motion.
- REQ-UX-009: Thumbnails use object-fit/aspect-ratio (no distortion).

---

## 8. Performance Requirements

- REQ-PERF-001: Normal market page = 0 full-chain scans, 0 per-market RPC fan-out.
- REQ-PERF-002: Track API p50/p95, DB query p95, page LCP, indexer lag, RPC failure rate, tx-confirm-to-UI delay.
- REQ-PERF-003: Pagination (no 10,000-row fetches for 20 displayed).

---

## 9. Security Requirements

- REQ-SEC-001: No secrets in browser bundles (no NEXT_PUBLIC_* secrets).
- REQ-SEC-002: Admin routes use proper authorization (not obscure URLs).
- REQ-SEC-003: Security headers (CSP, frame protection, MIME, referrer, permissions).
- REQ-SEC-004: Upload endpoints validate file type/size.
- REQ-SEC-005: Fail startup when required secrets are missing.

---

## 10. Internationalization Requirements

- REQ-I18N-001: All user-visible strings centralized (no hard-coded English).
- REQ-I18N-002: Locales: en, zh, es, fr (extensible, e.g. Vietnamese).
- REQ-I18N-003: Deterministic fallback.
- REQ-I18N-004: Preference persisted; entire UI switches consistently.

---

## 11. Traceability Matrix (initial)

| Requirement | Architecture | Implementation | Test | Status |
|-------------|--------------|----------------|------|--------|
| REQ-FUNC-001 | SMART_CONTRACT_SPEC | (pending) | (pending) | NOT IMPLEMENTED |
| REQ-SYNC-001 | INDEXER_ARCHITECTURE | (pending) | (pending) | NOT IMPLEMENTED |
| REQ-API-001 | API_SPEC | (pending) | (pending) | NOT IMPLEMENTED |
| REQ-UX-006 | UI_UX_SPEC | (pending) | (pending) | NOT IMPLEMENTED |
| REQ-SEC-001 | SECURITY_MODEL | (pending) | (pending) | NOT IMPLEMENTED |
| REQ-I18N-001 | INTERNATIONALIZATION | (pending) | (pending) | NOT IMPLEMENTED |