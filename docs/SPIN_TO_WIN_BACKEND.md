# Spin to Win — Backend

This documents the server-backed implementation for the Spin to Win experience. It
replaces the purely local (single-device, localStorage) behavior with a global,
admin-recordable ledger, wallet-authenticated writes, one-social-per-wallet
enforcement, shared tasks plus verification, and a tITL multiplier payment flow.

---

## 1. What was built

```
supabase/schema.sql                         # DB migration (tables + RLS + admin seed)
lib/spin-to-win/constants.ts                # Canonical prizes, multipliers, session math
lib/spin-to-win/types.ts                    # Shared browser/server DTOs
lib/spin-to-win/server/helpers.ts           # Auth (challenge/verify/token), responses
lib/spin-to-win/server/session.ts           # State load, result record, reconcile
lib/spin-to-win/client.ts                   # Browser helpers (sign-in, sync, record…)
app/api/spin-to-win/auth/route.ts           # POST challenge / verify
app/api/spin-to-win/state/route.ts          # GET state · POST record|reconcile
app/api/spin-to-win/tasks/route.ts          # GET tasks · POST create (admin)
app/api/spin-to-win/verify/route.ts         # POST submit | approve (admin)
app/api/spin-to-win/social/route.ts         # GET links · POST link (uniqueness)
app/api/spin-to-win/multiplier/route.ts     # POST intent | confirm (tITL payment)
app/api/spin-to-win/admin/route.ts          # GET global ledger · POST record (admin)
app/api/spin-to-win/health/route.ts         # GET backend availability probe
app/spin-to-win/page.tsx                    # Wired to the backend (with local fallback)
```

The page now, on wallet connect:
1. Probes the backend (`/api/spin-to-win/health`).
2. If available, runs a wallet challenge/verify to obtain a signed bearer token.
3. Hydrates tasks, verified tasks, bonus spins and social links from the server.
4. Records every spin result into the shared `spin_results` ledger.
5. Enforces one X/Telegram account per wallet via DB unique constraints.
6. Submits task verifications to the server for the admin approval trail.
7. Admins see the **global** ledger (aggregated across all wallets).

When the backend is not configured, the page **silently falls back** to the old
local storage behavior, so nothing breaks without the database.

---

## 2. One-time setup

### 2.1 Database
1. Create a Supabase project (or re-use the existing one).
2. Open the **SQL Editor**, paste the contents of `supabase/schema.sql`, run it.
   This creates all tables, enables RLS, and seeds the default admin wallet
   `0x6e832252ea4c78068ee109d953724d2762431992`.

### 2.2 Environment variables
Add these to your Netlify site (and local `.env.local`):

| Variable | Purpose |
|----------|---------|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_SECRET_KEY` | Your Supabase **service role** key (server-only) |
| `SPIN_TREASURY_ADDRESS` | Recipient wallet for tITL multiplier payments (lowercase) |

The `auth/health` route only reports the backend as "configured" when both
`SUPABASE_URL` and `SUPABASE_SECRET_KEY` are present — that is the same check the
browser uses to decide whether to enable the server-backed flow.

---

## 3. Endpoint reference

All responses use a JSON envelope:
`{ data?, meta, error: { code, message } | null }`. Protected routes require
`Authorization: Bearer <token>` obtained from `auth/verify`.

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/spin-to-win/auth` | — | `challenge` returns a message to sign; `verify` checks the signature (ethers `verifyMessage`) and returns a bearer token. |
| `GET /api/spin-to-win/state?sessionStart=` | wallet | Server-side spinsUsed/bonus/verified/accounts/wonItp for the session. |
| `POST /api/spin-to-win/state` | wallet | `record` writes the global ledger (idempotent) + bumps counters; `reconcile` mirrors UI values. |
| `GET /api/spin-to-win/tasks` | public | Active shared tasks (seeds defaults on first call). |
| `POST /api/spin-to-win/tasks` | admin | Publish a global task. |
| `POST /api/spin-to-win/verify` | user/admin | `submit` → pending verification; `approve` (admin) → approve + grant +2 spins. |
| `GET /api/spin-to-win/social` | wallet | Linked accounts. |
| `POST /api/spin-to-win/social` | wallet | Link; returns `409 ACCOUNT_ALREADY_LINKED` if already on another wallet. |
| `POST /api/spin-to-win/multiplier` | wallet | `intent` → pending purchase + recipient/amount; `confirm` → confirm + unlock multiplier. |
| `GET /api/spin-to-win/admin` | admin | Global ledger, pending verifications, recent actions. |
| `POST /api/spin-to-win/admin` | admin | Admin records an outcome. |
| `GET /api/spin-to-win/health` | public | `{ configured }` probe. |

---

## 4. How it maps to your requirements

1. **Global + admin-recorded results** — every outcome goes to `spin_results`
   (idempotent via `merchant_client_id`). Admins read/record all wallets via
   `/api/spin-to-win/admin`; the in-page admin panel aggregates the server ledger.
2. **Pay with tITL for multiplier** — `/api/spin-to-win/multiplier` creates a
   pending purchase with the treasury recipient + wei amount; confirm unlocks the
   multiplier and sets `multiplier_confirmed` on the session.
3. **Social verification + task record/verify** — task submissions write
   `spin_task_verifications` (pending); admin approval grants +2 spins and writes
   an `admin_actions` audit row.
4. **No multiple wallets on one social account** — enforced by the DB unique
   constraints `(provider, provider_account_id)` and `(provider, handle)` on
   `social_account_links`; the `/social` route turns violations into a
   `ACCOUNT_ALREADY_LINKED` response shown in the UI.
5. **Anything else** — signed-wallet auth on every write, replay-safe challenges,
   an `admins` table (replacing the hard-coded address), an `admin_actions` audit
   log, and per-12h server-side session accounting.

---

## 5. What you still need to do (now-implemented integrations)

The three previously-flagged integration points are now **implemented** in code.
What remains is purely **you creating the credentials/accounts** and adding the
env vars, because they require live third-party apps:

### On-chain tITL payment verification (implemented)
- Code: `lib/spin-to-win/server/rpc.ts` + wired into `/multiplier` `confirm`.
- Before unlocking, the server fetches the tx receipt via an authenticated
  `JsonRpcProvider` (service-wallet bearer) and verifies **value == cost**, **to ==
  `SPIN_TREASURY_ADDRESS`**, **from == user wallet**, and confirmed status.
- Requires: `SERVICE_WALLET_PRIVATE_KEY` (already used across the repo) so the
  provider can obtain an RPC bearer token. No new account needed if you already
  run the indexer/keeper.

### Telegram verification (implemented)
- Code: `app/spin-to-win/telegram/route.ts` (webhook) + `POST /social` `pending`
  action + `social_pending_links` table + UI in `app/spin-to-win/SocialConnect.tsx`.
- Flow: user taps **Connect Telegram** → the UI guides them (join the channel) →
  issues an 8-char code → user DMs the bot with that code → the bot webhook
  confirms the **stable numeric Telegram id** (`from.id`) and stores the verified
  `provider_account_id`. The page polls until the server marks it verified, then
  unlocks the account. **The spinner only activates once the account is verified.**
- **You must:**
  1. Create a bot via [@BotFather](https://t.me/BotFather), get the token.
  2. Set env: `SPIN_TELEGRAM_BOT_TOKEN`, `SPIN_TELEGRAM_BOT_HANDLE`,
     `SPIN_TELEGRAM_WEBHOOK_SECRET`.
  3. Point the bot's webhook at your deployed URL:
     `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<your-domain>/api/spin-to-win/telegram&secret_token=<SECRET>`
  4. (Re-run `supabase/schema.sql` for the new `social_pending_links` table.)

### X verification (implemented)
- Code: `lib/spin-to-win/server/xVerify.ts` + `POST /social` `verify-x` action +
  UI in `app/spin-to-win/SocialConnect.tsx`.
- Flow: user taps **Connect X** → the UI guides them (follow @InterPredict) →
  issues a code → user posts a tweet containing it → pastes the tweet URL → server
  verifies via the X API v2 that the tweet author's username matches the claimed
  handle and the text contains the code, then stores the author X user id as
  verified. **The spinner only activates once the account is verified.**
- **You must:**
  1. Create an X developer app (developer portal), get Consumer Key/Secret.
  2. Set env: `SPIN_X_API_KEY` + `SPIN_X_API_SECRET` (or a ready-made
     `SPIN_X_BEARER_TOKEN`). App-only OAuth 2.0 is enough — no per-user OAuth needed.
  3. (Re-run `supabase/schema.sql` for `social_pending_links`.)

### Verification gating
The wheel only unlocks when **both** X and Telegram are verified. The client no
longer trusts typed/local handles: `loadServerState` only returns verified handles,
localStorage account-restore was removed, and the server is the authoritative
source of connected status.

### Optional hardening
- Add rate limiting in front of the challenge/verify/record/verify-x routes.

Everything else — schema, signed-wallet auth, global ledger, admin panel, social
uniqueness, tasks, verification queue, multiplier payments — is implemented and
wired. The page uses local storage until `SUPABASE_URL`/`SUPABASE_SECRET_KEY` are
set and the migration is applied, then automatically switches to the global
backend.