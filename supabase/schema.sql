-- ============================================================
-- Spin to Win — Supabase schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).
-- Guarded by `IF NOT EXISTS`.
--
-- Row Level Security is enabled on every table. Public reads are open
-- for the ledger/tasks; all writes flow through Node API routes which use
-- the server-only service-role client (lib/supabase.ts) after verifying a
-- signed-wallet bearer token.
-- ============================================================

-- ---------- Admins (replaces hard-coded ADMIN_ADDRESS) ----------
create table if not exists public.spin_admins (
  wallet text primary key,               -- lowercase address
  label text,
  created_at timestamptz not null default now()
);

-- ---------- Profiles (one row per wallet) ----------
create table if not exists public.spin_profiles (
  wallet text primary key,               -- lowercase
  total_spins integer not null default 0,
  total_won_itp numeric(38, 0) not null default 0,
  won_spins integer not null default 0,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------- Sessions (12h window per wallet) ----------
create table if not exists public.spin_sessions (
  wallet text not null,                  -- lowercase
  session_start bigint not null,         -- ms epoch window start
  spins_used integer not null default 0,
  bonus_spins integer not null default 0,
  verified_count integer not null default 0,
  selected_multiplier integer not null default 1,
  multiplier_confirmed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (wallet, session_start)
);

-- ---------- Global result ledger (requirement #1) ----------
create table if not exists public.spin_results (
  id uuid primary key,
  merchant_client_id text not null unique, -- idempotency key
  session_start bigint not null,
  wallet text not null,                  -- lowercase
  prize_index integer not null,
  prize_label text not null,
  multiplier integer not null default 1,
  won_itp numeric(38, 0) not null default 0,
  won_spins integer not null default 0,
  recorded_by text,                      -- admin wallet (lowercase), null if self-recorded
  created_at timestamptz not null default now()
);
create index if not exists spin_results_session_idx on public.spin_results (session_start desc);
create index if not exists spin_results_wallet_idx on public.spin_results (wallet);
create index if not exists spin_results_created_idx on public.spin_results (created_at desc);

-- ---------- Shared published tasks ----------
create table if not exists public.spin_tasks (
  id text primary key,
  kind text not null,
  title text not null,
  description text not null default '',
  href text not null default '',
  active boolean not null default true,
  created_session bigint not null default 0,
  source text not null default 'default', -- 'default' | 'admin'
  created_at timestamptz not null default now()
);

-- ---------- Per-wallet task verifications (requirement #3) ----------
create table if not exists public.spin_task_verifications (
  id uuid primary key,
  task_id text not null,
  wallet text not null,                  -- lowercase
  day_start bigint not null,
  proof_link text,
  verified boolean not null default false,
  verified_by text,                      -- admin wallet (lowercase)
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  unique (task_id, wallet, day_start)
);

-- ---------- Social account links (requirement #4) ----------
create table if not exists public.social_account_links (
  wallet text not null,                  -- lowercase
  provider text not null,                -- 'x' | 'telegram'
  provider_account_id text not null default '', -- stable provider user id
  handle text not null,                  -- lowercased unique handle
  verified boolean not null default false,
  verified_at timestamptz,
  created_at timestamptz not null default now(),
  -- A social account may belong to exactly ONE wallet.
  unique (provider, provider_account_id),
  unique (provider, handle),
  unique (wallet, provider)
);
-- ---------- Multiplier purchases (requirement #2) ----------
create table if not exists public.multiplier_purchases (
  id uuid primary key,
  wallet text not null,                  -- lowercase
  session_start bigint not null,
  multiplier integer not null,
  cost_wei numeric(38, 0) not null default 0,
  recipient text not null,
  tx_hash text not null default '',
  status text not null default 'pending', -- 'pending' | 'confirmed' | 'failed'
  created_at timestamptz not null default now()
);
create index if not exists multiplier_purchases_wallet_idx on public.multiplier_purchases (wallet);

-- ---------- Auth: challenges + tokens ----------
create table if not exists public.spin_auth_challenges (
  id uuid primary key,
  wallet text not null,                  -- lowercase
  message_to_sign text not null,
  expires_at bigint not null,            -- ms epoch
  used boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists spin_auth_challenges_expires_idx on public.spin_auth_challenges (expires_at);

create table if not exists public.spin_auth_tokens (
  access_token text primary key,
  wallet text not null,                  -- lowercase
  expires_at bigint not null,            -- ms epoch, any later value revokes
  created_at timestamptz not null default now()
);
create index if not exists spin_auth_tokens_wallet_idx on public.spin_auth_tokens (wallet);

-- ---------- Admin action audit (requirement #5) ----------
create table if not exists public.admin_actions (
  id uuid primary key,
  admin_wallet text not null,            -- lowercase
  action text not null,
  target text not null default '',
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_actions_admin_idx on public.admin_actions (admin_wallet);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.spin_admins enable row level security;
alter table public.spin_profiles enable row level security;
alter table public.spin_sessions enable row level security;
alter table public.spin_results enable row level security;
alter table public.spin_tasks enable row level security;
alter table public.spin_task_verifications enable row level security;
alter table public.social_account_links enable row level security;
alter table public.multiplier_purchases enable row level security;
alter table public.spin_auth_challenges enable row level security;
alter table public.spin_auth_tokens enable row level security;
alter table public.admin_actions enable row level security;

-- Public can read the global ledger and shared tasks.
drop policy if exists "spin_results_public_read" on public.spin_results;
create policy "spin_results_public_read" on public.spin_results for select using (true);
drop policy if exists "spin_tasks_public_read" on public.spin_tasks;
create policy "spin_tasks_public_read" on public.spin_tasks for select using (true);

-- Browsers may read only their own wallet rows. All mutations are performed by
-- the server via the service-role client (bypasses RLS) after signature check.
drop policy if exists "spin_profiles_own_read" on public.spin_profiles;
create policy "spin_profiles_own_read" on public.spin_profiles
  for select using (wallet = coalesce(auth.uid()::text, ''));

drop policy if exists "spin_sessions_own_read" on public.spin_sessions;
create policy "spin_sessions_own_read" on public.spin_sessions
  for select using (wallet = coalesce(auth.uid()::text, ''));

drop policy if exists "spin_task_verifications_own_read" on public.spin_task_verifications;
create policy "spin_task_verifications_own_read" on public.spin_task_verifications
  for select using (wallet = coalesce(auth.uid()::text, ''));

drop policy if exists "social_account_links_own_read" on public.social_account_links;
create policy "social_account_links_own_read" on public.social_account_links
  for select using (wallet = coalesce(auth.uid()::text, ''));

-- Seed the default admin wallet.
insert into public.spin_admins (wallet, label)
values ('0x6e832252ea4c78068ee109d953724d2762431992', 'InterPredict Spin Admin')
on conflict (wallet) do nothing;

-- ============================================================
-- Addendum: social verification pending links
-- (Telegram / X bot + tweet proof flow). Additive; safe to
-- re-run alongside the rest of this file.
-- ============================================================
create table if not exists public.social_pending_links (
  id uuid primary key,
  wallet text not null,                  -- lowercase
  provider text not null,                -- 'telegram' | 'x'
  code text not null unique,             -- short one-time code the user shares
  expires_at bigint not null,            -- ms epoch
  used boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists social_pending_links_wallet_idx on public.social_pending_links (wallet);
alter table public.social_pending_links enable row level security;