-- Around the Clash / Clash Index pre-result snapshots.
-- These rows preserve the rating state used to evaluate a published match.
-- They are intentionally separate from launch_players.clash_index, which continues to hold current CI.

create table if not exists public.clash_match_rating_snapshots (
  match_id text not null,
  player_id text not null references public.launch_players(id) on delete restrict,
  team_id text not null references public.launch_teams(id) on delete restrict,
  player_name text not null,
  team_name text not null,
  side text not null check (side in ('Home', 'Away')),
  clash_index_before integer not null,
  provisional_before boolean not null default false,
  algorithm_version text not null,
  captured_at timestamptz not null default now(),
  primary key (match_id, player_id)
);

create index if not exists clash_match_rating_snapshots_player_idx
  on public.clash_match_rating_snapshots(player_id, captured_at desc);

create index if not exists clash_match_rating_snapshots_match_idx
  on public.clash_match_rating_snapshots(match_id);

alter table public.clash_match_rating_snapshots enable row level security;

-- Snapshot data is an internal analytical record for now. Server-side commissioner
-- workflows use the service-role client; no public read/write policy is created.

comment on table public.clash_match_rating_snapshots is
  'Immutable pre-result Clash Index snapshots used for CI calculation validation and Around the Clash statistics.';
comment on column public.clash_match_rating_snapshots.clash_index_before is
  'Player CI frozen before any result from this team match is applied.';
comment on column public.clash_match_rating_snapshots.algorithm_version is
  'Version of the Clash Index/prediction rules used for this snapshot.';
