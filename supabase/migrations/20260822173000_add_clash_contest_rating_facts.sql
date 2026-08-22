-- Immutable player-level facts for each rated Matchday contest.
-- This is the bridge between CI updates, Previous Matches and Around the Clash.

create table if not exists public.clash_contest_rating_facts (
  contest_id text not null references public.launch_result_contests(id) on delete restrict,
  match_id text not null,
  player_id text not null references public.launch_players(id) on delete restrict,
  team_id text not null references public.launch_teams(id) on delete restrict,
  player_name text not null,
  team_name text not null,
  side text not null check (side in ('Home', 'Away')),
  format text not null check (format in ('Singles', 'Doubles')),
  outcome text not null check (outcome in ('W', 'L', 'T')),
  clash_index_before integer not null,
  opponent_effective_ci numeric(8,2) not null,
  win_probability numeric(8,7) not null check (win_probability >= 0 and win_probability <= 1),
  actual_points numeric(3,2) not null check (actual_points in (0, 0.5, 1)),
  expected_points numeric(8,7) not null check (expected_points >= 0 and expected_points <= 1),
  performance_vs_expected numeric(9,7) not null,
  ci_delta integer not null,
  clash_index_after integer not null,
  algorithm_version text not null,
  calculated_at timestamptz not null default now(),
  primary key (contest_id, player_id),
  constraint clash_contest_rating_facts_match_snapshot_fk
    foreign key (match_id, player_id)
    references public.clash_match_rating_snapshots(match_id, player_id)
    on delete restrict
);

create index if not exists clash_contest_rating_facts_player_idx
  on public.clash_contest_rating_facts(player_id, calculated_at desc);
create index if not exists clash_contest_rating_facts_match_idx
  on public.clash_contest_rating_facts(match_id);
create index if not exists clash_contest_rating_facts_upset_idx
  on public.clash_contest_rating_facts(outcome, win_probability);
create index if not exists clash_contest_rating_facts_performance_idx
  on public.clash_contest_rating_facts(performance_vs_expected desc);

alter table public.clash_contest_rating_facts enable row level security;

-- Internal analytical data for now. No public policy is intentionally created.

comment on table public.clash_contest_rating_facts is
  'Immutable per-player contest facts calculated from frozen pre-match CI; powers CI history and Around the Clash rankings.';
comment on column public.clash_contest_rating_facts.opponent_effective_ci is
  'Singles opponent CI or 80/20 effective opposing doubles pair CI used for this calculation.';
comment on column public.clash_contest_rating_facts.ci_delta is
  'Signed CI movement attributable to this contest for this player.';
