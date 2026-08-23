-- One row per successfully CI-rated team match. This is the idempotency/audit
-- boundary; its primary key makes a second rating publication impossible.

create table if not exists public.clash_match_publications (
  match_id text primary key,
  algorithm_version text not null,
  snapshot_count integer not null check (snapshot_count > 0),
  fact_count integer not null check (fact_count > 0),
  player_update_count integer not null check (player_update_count > 0),
  published_at timestamptz not null default now()
);

alter table public.clash_match_publications enable row level security;

comment on table public.clash_match_publications is
  'Successful atomic CI publication ledger. Presence means CI for this Matchday has already been applied.';
