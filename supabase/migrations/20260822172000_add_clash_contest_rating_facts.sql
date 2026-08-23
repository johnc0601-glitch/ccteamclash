-- Immutable per-player/per-contest facts used by CI history and Around the Clash.
-- Kept separate from launch_result_*: Matchday owns results; CI owns derived analytics.
-- Important: a player may play more than once in a Matchday. Every contest fact
-- uses the same frozen pre-match CI; only the aggregate match publication changes CI.

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
  opponent_effective_ci numeric not null,
  win_probability numeric not null check (win_probability between 0 and 1),
  actual_points numeric not null check (actual_points in (0, 0.5, 1)),
  expected_points numeric not null check (expected_points between 0 and 1),
  performance_vs_expected numeric not null,
  ci_delta integer not null,
  algorithm_version text not null,
  calculated_at timestamptz not null,
  primary key (contest_id, player_id),
  foreign key (match_id, player_id)
    references public.clash_match_rating_snapshots(match_id, player_id) on delete restrict
);

create index if not exists clash_contest_rating_facts_match_idx
  on public.clash_contest_rating_facts(match_id);
create index if not exists clash_contest_rating_facts_player_idx
  on public.clash_contest_rating_facts(player_id, calculated_at desc);
create index if not exists clash_contest_rating_facts_story_idx
  on public.clash_contest_rating_facts(win_probability, performance_vs_expected desc);

alter table public.clash_contest_rating_facts enable row level security;

comment on table public.clash_contest_rating_facts is
  'Immutable CI facts derived from a published Matchday contest and its frozen pre-match CI snapshot.';
comment on column public.clash_contest_rating_facts.ci_delta is
  'This contest contribution only. Final player CI is frozen pre-match CI plus all contest deltas from the Matchday.';
