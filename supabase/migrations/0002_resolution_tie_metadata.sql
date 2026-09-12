-- Adds resolution tie metadata, composite checkpoints, and Realtime publication.

create table if not exists market_resolutions (
  market_id bigint primary key references markets(id) on delete cascade,
  active_dec_snapshot integer not null default 0,
  quorum integer not null default 0,
  total_votes integer not null default 0,
  confirmed_outcome smallint,
  outcome_confirmed boolean not null default false,
  finalized boolean not null default false,
  quorum_reached boolean,
  tied boolean not null default false,
  dec_outcome_available boolean not null default false,
  dec_suggested_outcome smallint,
  
  chain_id text not null,
  contract_address text not null,
  block_number bigint not null,
  block_hash text not null,
  transaction_hash text not null,
  log_index integer not null,
  indexed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  
  constraint chk_dec_outcome_available_has_value check (
    (dec_outcome_available = true and dec_suggested_outcome is not null)
    or
    (dec_outcome_available = false)
  ),

  
  constraint chk_tie_implies_no_dec_outcome check (
    (tied = true and dec_outcome_available = false)
    or
    (tied = false)
  ),

  
  constraint chk_no_quorum_implies_no_dec_outcome check (
    (quorum_reached = false and dec_outcome_available = false)
    or
    (quorum_reached is null)
    or
    (quorum_reached = true)
  )
);

create index if not exists idx_market_resolutions_market on market_resolutions (market_id);

alter table sync_checkpoints
  drop constraint if exists sync_checkpoints_pkey;

alter table sync_checkpoints
  add primary key (chain_id, contract_address);

alter publication supabase_realtime add table markets;
alter publication supabase_realtime add table market_outcomes;
alter publication supabase_realtime add table market_resolutions;
alter publication supabase_realtime add table participations;
alter publication supabase_realtime add table resolution_votes;

alter table market_resolutions enable row level security;
