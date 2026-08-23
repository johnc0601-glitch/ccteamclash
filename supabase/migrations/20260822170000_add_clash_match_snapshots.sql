-- Around the Clash / Clash Index pre-result snapshots.
-- Every active Matchday player has a numeric CI. `GhostAverage` records that the
-- number is an averaged starting CI rather than an established match-history CI.

create table if not exists public.clash_match_rating_snapshots (
  match_id text not null,
  player_id text not null references public.launch_players(id) on delete restrict,
  team_id text not null references public.launch_teams(id) on delete restrict,
  player_name text not null,
  team_name text not null,
  side text not null check (side in ('Home', 'Away')),
  clash_index_before integer not null,
  ci_source_before text not null check (ci_source_before in ('Established', 'GhostAverage')),
  algorithm_version text not null,
  captured_at timestamptz not null default now(),
  primary key (match_id, player_id)
);

create index if not exists clash_match_rating_snapshots_player_idx
  on public.clash_match_rating_snapshots(player_id, captured_at desc);

create index if not exists clash_match_rating_snapshots_match_idx
  on public.clash_match_rating_snapshots(match_id);

alter table public.clash_match_rating_snapshots enable row level security;

-- Snapshot data is internal analytical history for now. Server-side commissioner
-- workflows use the service-role client; no public read/write policy is created.

comment on table public.clash_match_rating_snapshots is
  'Immutable pre-result Clash Index snapshots used for CI calculation validation and Around the Clash statistics.';
comment on column public.clash_match_rating_snapshots.clash_index_before is
  'Numeric player CI frozen before any result from this team match is applied.';
comment on column public.clash_match_rating_snapshots.ci_source_before is
  'Established = history-based CI; GhostAverage = averaged starting CI displayed with an asterisk.';
comment on column public.clash_match_rating_snapshots.algorithm_version is
  'Version of the Clash Index/prediction rules used for this snapshot.';
