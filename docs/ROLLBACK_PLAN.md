# InterPredict V2 — Rollback Plan

> Version: 2.0.0
> Date: 2026-08-16
> Status: DRAFT (Phase Zero)

---

## 1. Principle

At all reasonable checkpoints the repository remains recoverable. The legacy application is preserved on `main` (tag `interpredict-beta-final`, commit `342db96`) and can be restored at any time.

---

## 2. Rollback Triggers

- Critical contract defect discovered post-deployment.
- Database migration failure.
- Indexer corruption.
- API regression.
- Frontend regression.

---

## 3. Application Rollback

1. Revert the `interpredict-v2-rebuild` branch to the last known-good commit.
2. Or re-deploy the legacy commit `342db96` (tag `interpredict-beta-final`).
3. Restore the previous `NEXT_PUBLIC_CONTRACT_ADDRESS` (legacy contract `0x3E5936F13e1194380A66c3c1d75D4D7342299CfF`).
4. Restore the previous Netlify Blobs cache (legacy read path).

---

## 4. Database Rollback

- Migrations are additive during rollout; destructive migrations are avoided.
- Each migration has a documented down path.
- If a migration fails, stop the indexer, revert the migration, restart.

---

## 5. Contract Rollback

- The legacy contract remains deployed and untouched.
- The frontend can be pointed back to the legacy contract address.
- No Mainnet deployment exists, so no Mainnet rollback is required.

---

## 6. Indexer Rollback

- Stop the indexer.
- Reset `sync_checkpoints` to a known-good block.
- Re-run backfill from that block (idempotent).

---

## 7. Verification After Rollback

- Confirm markets load from the restored read path.
- Confirm wallet activity is visible.
- Confirm no partial/corrupt data remains.

---

## 8. Git Safety (rollback constraints)

- No force push, no history rewrite.
- No deletion of `main` or tags.
- Rollback is achieved by reverting commits or re-deploying a known-good commit — never by rewriting history.