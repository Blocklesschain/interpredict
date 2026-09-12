-- InterPredict V2 — RLS Policies
-- Supabase PostgreSQL migration 0002
--
-- Read model is public for browsing (markets, outcomes, categories, locales).
-- Personal activity (participations, votes) is readable by the owning wallet.
-- All writes are service-role only (indexer/API).

-- ---------------------------------------------------------------------------
-- Public read access (browsing)
-- ---------------------------------------------------------------------------
create policy "markets_public_read" on markets
  for select using (true);

create policy "market_outcomes_public_read" on market_outcomes
  for select using (true);

create policy "market_state_history_public_read" on market_state_history
  for select using (true);

create policy "categories_public_read" on categories
  for select using (true);

create policy "supported_locales_public_read" on supported_locales
  for select using (true);

-- ---------------------------------------------------------------------------
-- Personal activity: readable by the owning wallet (lowercase-normalized)
-- ---------------------------------------------------------------------------
create policy "participations_owner_read" on participations
  for select using (participant = lower(auth.jwt() ->> 'wallet_address'));

create policy "proposal_votes_owner_read" on proposal_votes
  for select using (voter = lower(auth.jwt() ->> 'wallet_address'));

create policy "resolution_votes_owner_read" on resolution_votes
  for select using (voter = lower(auth.jwt() ->> 'wallet_address'));

-- ---------------------------------------------------------------------------
-- DEC directory is public (membership status is not sensitive)
-- ---------------------------------------------------------------------------
create policy "dec_members_public_read" on dec_members
  for select using (true);

-- ---------------------------------------------------------------------------
-- Server-only tables: no anon/authenticated access. Service role bypasses RLS.
-- ---------------------------------------------------------------------------
-- transactions, sync_checkpoints, sync_failures, resolution_requests
-- intentionally have NO select policies for anon/authenticated roles.