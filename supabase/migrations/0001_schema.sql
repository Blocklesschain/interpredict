-- InterPredict V2 — Database Schema
-- Supabase PostgreSQL migration 0001
-- Chain-authoritative read model. All chain-derived tables carry provenance.

-- ---------------------------------------------------------------------------
-- Provenance columns (applied to chain-derived tables)
-- ---------------------------------------------------------------------------

-- markets
create table if not exists markets (
  id bigint primary key,
  question text not null,
  description text not null default '',
  category smallint not null,
  custom_category text,
  origin smallint not null default 0,
  creator text not null,
  state smallint not null,
  end_time bigint not null,
  resolution_criteria text not null default '',
  thumbnail_url text,
  total_volume numeric(78,0) not null default 0,
  participant_count integer not null default 0,
  confirmed_outcome smallint,
  finalized boolean not null default false,
  cancelled boolean not null default false,
  cancel_reason text,
  -- provenance
  chain_id text not null,
  contract_address text not null,
  block_number bigint not null,
  block_hash text not null,
  transaction_hash text not null,
  log_index integer not null,
  indexed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_markets_state on markets (state);
create index if not exists idx_markets_creator on markets (creator);
create index if not exists idx_markets_category on markets (category);
create index if not exists idx_markets_end_time on markets (end_time);
create index if not exists idx_markets_created_at on markets (created_at);

-- market_outcomes
create table if not exists market_outcomes (
  market_id bigint not null references markets(id) on delete cascade,
  outcome_index smallint not null,
  label text not null,
  pool numeric(78,0) not null default 0,
  price numeric(38,18) not null default 0,
  primary key (market_id, outcome_index)
);

-- market_state_history
create table if not exists market_state_history (
  id bigserial primary key,
  market_id bigint not null references markets(id) on delete cascade,
  from_state smallint not null,
  to_state smallint not null,
  block_number bigint not null,
  transaction_hash text not null,
  log_index integer not null,
  indexed_at timestamptz not null default now()
);

create index if not exists idx_market_state_history_market on market_state_history (market_id);

-- participations
create table if not exists participations (
  market_id bigint not null references markets(id) on delete cascade,
  participant text not null,
  outcome_index smallint not null,
  gross numeric(78,0) not null,
  net numeric(78,0) not null,
  shares numeric(78,0) not null,
  fee numeric(78,0) not null,
  claimed boolean not null default false,
  -- provenance
  chain_id text not null,
  contract_address text not null,
  block_number bigint not null,
  block_hash text not null,
  transaction_hash text not null,
  log_index integer not null,
  indexed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (market_id, participant, outcome_index)
);

create index if not exists idx_participations_participant on participations (participant);

-- proposal_votes
create table if not exists proposal_votes (
  market_id bigint not null references markets(id) on delete cascade,
  voter text not null,
  vote smallint not null,
  -- provenance
  chain_id text not null,
  contract_address text not null,
  block_number bigint not null,
  block_hash text not null,
  transaction_hash text not null,
  log_index integer not null,
  indexed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (market_id, voter)
);

-- resolution_requests
create table if not exists resolution_requests (
  market_id bigint not null references markets(id) on delete cascade,
  requester text not null,
  deadline bigint not null,
  -- provenance
  chain_id text not null,
  contract_address text not null,
  block_number bigint not null,
  block_hash text not null,
  transaction_hash text not null,
  log_index integer not null,
  indexed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- resolution_votes
create table if not exists resolution_votes (
  market_id bigint not null references markets(id) on delete cascade,
  voter text not null,
  outcome_index smallint not null,
  -- provenance
  chain_id text not null,
  contract_address text not null,
  block_number bigint not null,
  block_hash text not null,
  transaction_hash text not null,
  log_index integer not null,
  indexed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (market_id, voter)
);

-- dec_members
create table if not exists dec_members (
  address text primary key,
  active boolean not null default true,
  reputation integer not null default 1000,
  proposal_votes integer not null default 0,
  resolution_votes integer not null default 0,
  honest_votes integer not null default 0,
  incorrect_votes integer not null default 0,
  total_rewards_earned numeric(78,0) not null default 0,
  total_rewards_claimed numeric(78,0) not null default 0,
  unclaimed_rewards numeric(78,0) not null default 0,
  -- provenance
  chain_id text not null,
  contract_address text not null,
  block_number bigint not null,
  block_hash text not null,
  transaction_hash text not null,
  log_index integer not null,
  indexed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- transactions
create table if not exists transactions (
  hash text primary key,
  block_number bigint not null,
  from_address text not null,
  to_address text not null,
  method text,
  status smallint not null,
  indexed_at timestamptz not null default now()
);

create index if not exists idx_transactions_block_number on transactions (block_number);
create index if not exists idx_transactions_from_address on transactions (from_address);

-- sync_checkpoints
create table if not exists sync_checkpoints (
  chain_id text primary key,
  contract_address text not null,
  last_processed_block bigint not null,
  last_processed_block_hash text,
  last_successful_sync_at timestamptz,
  sync_status text not null default 'idle',
  last_error text
);

-- sync_failures
create table if not exists sync_failures (
  id bigserial primary key,
  block_number bigint not null,
  transaction_hash text,
  log_index integer,
  error text not null,
  retry_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- categories
create table if not exists categories (
  id smallint primary key,
  key text not null unique,
  label_key text not null
);

insert into categories (id, key, label_key) values
  (0, 'sports', 'category.sports'),
  (1, 'politics', 'category.politics'),
  (2, 'crypto', 'category.crypto'),
  (3, 'blockchain', 'category.blockchain'),
  (4, 'technology', 'category.technology'),
  (5, 'ai', 'category.ai'),
  (6, 'economics', 'category.economics'),
  (7, 'finance', 'category.finance'),
  (8, 'business', 'category.business'),
  (9, 'science', 'category.science'),
  (10, 'climate', 'category.climate'),
  (11, 'entertainment', 'category.entertainment'),
  (12, 'culture', 'category.culture'),
  (13, 'health', 'category.health'),
  (14, 'real_estate', 'category.real_estate'),
  (15, 'gaming', 'category.gaming'),
  (16, 'web3', 'category.web3'),
  (17, 'other', 'category.other')
on conflict (id) do nothing;

-- supported_locales
create table if not exists supported_locales (
  code text primary key,
  enabled boolean not null default true
);

insert into supported_locales (code, enabled) values
  ('en', true),
  ('zh', true),
  ('es', true),
  ('fr', true)
on conflict (code) do nothing;

-- ---------------------------------------------------------------------------
-- Row Level Security: enable on all tables; no anon access to chain-derived data.
-- The indexer and API use the service role.
-- ---------------------------------------------------------------------------
alter table markets enable row level security;
alter table market_outcomes enable row level security;
alter table market_state_history enable row level security;
alter table participations enable row level security;
alter table proposal_votes enable row level security;
alter table resolution_requests enable row level security;
alter table resolution_votes enable row level security;
alter table dec_members enable row level security;
alter table transactions enable row level security;
alter table sync_checkpoints enable row level security;
alter table sync_failures enable row level security;
alter table categories enable row level security;
alter table supported_locales enable row level security;