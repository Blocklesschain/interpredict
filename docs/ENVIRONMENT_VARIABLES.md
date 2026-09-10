# InterPredict V2 — Environment Variables

> Version: 2.0.0
> Date: 2026-08-16
> Status: DRAFT (Phase Zero)

---

## 1. Classification

| Category | Meaning |
|----------|---------|
| **public** | Safe for browser bundle (`NEXT_PUBLIC_*`) |
| **server secret** | Server-only, never bundled |
| **build-time** | Read during build |
| **runtime** | Read at request/function runtime |

---

## 2. Public Configuration

| Variable | Category | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_CONTRACT_ADDRESS` | public, runtime | Deployed InterPredictV2 address |
| `NEXT_PUBLIC_CHAIN_ID` | public, runtime | `19042026` |
| `NEXT_PUBLIC_RPC_URL` | public, runtime | InterLink testnet RPC |

---

## 3. Server Secrets

| Variable | Category | Notes |
|----------|----------|-------|
| `SUPABASE_URL` | server secret, runtime | Supabase project URL |
| `SUPABASE_SECRET_KEY` | server secret, runtime | Service role key (never browser) |
| `INTERLINK_RPC_URL` | server secret, runtime | Authenticated RPC endpoint |
| `INTERLINK_BACKEND_PRIVATE_KEY` | server secret, runtime | Service wallet private key |
| `SERVICE_WALLET_PRIVATE_KEY` | server secret, runtime | Alias for service wallet |
| `CONTRACT_ADDRESS` | server secret, runtime | Server-side contract address |
| `INDEXER_SECRET` | server secret, runtime | Protects indexer refresh/backfill |
| `INDEXER_START_BLOCK` | server secret, runtime | Initial sync block |
| `INDEXER_BATCH_SIZE` | server secret, runtime | Blocks per sync batch |
| `INDEXER_CONFIRMATION_DEPTH` | server secret, runtime | Confirmation depth |
| `CRON_SECRET` | server secret, runtime | Protects keeper/cron routes |
| `SPIN_TREASURY_ADDRESS` | server secret, runtime | Recipient wallet for Spin to Win tITL multiplier payments (lowercase) |
| `SPIN_TELEGRAM_BOT_TOKEN` | server secret, runtime | Telegram bot token for social verification |
| `SPIN_TELEGRAM_BOT_HANDLE` | server secret, runtime | Telegram bot handle (defaults to `InterPredictVerifyBot`) |
| `SPIN_TELEGRAM_WEBHOOK_SECRET` | server secret, runtime | Secret token used to authenticate Telegram webhook calls |
| `SPIN_X_API_KEY` | server secret, runtime | X API key (OAuth 2.0 app-only) for tweet verification |
| `SPIN_X_API_SECRET` | server secret, runtime | X API secret (OAuth 2.0 app-only) |
| `SPIN_X_BEARER_TOKEN` | server secret, runtime | Alternative ready-made X app-only bearer token |

---

## 4. Removed (legacy)

| Variable | Reason |
|----------|--------|
| `NEXT_PUBLIC_TITL_TOKEN_ADDRESS` | Obsolete — no ERC20 token |
| `PRIVATE_KEY` | Replaced by `INTERLINK_BACKEND_PRIVATE_KEY` |
| `INTERLINK_TOKEN` | Replaced by service-wallet auth flow |
| `TREASURY_ADDRESS` | Now a contract constructor arg |
| `ADMIN_ADDRESS` | Now a contract constructor arg |

---

## 5. Rules

- Never name server secrets `NEXT_PUBLIC_*`.
- Fail startup/deployment when required secrets are missing (no unsafe defaults).
- Never hard-code secrets.
- Never log secrets.
- Testnet configuration must never silently become production configuration.