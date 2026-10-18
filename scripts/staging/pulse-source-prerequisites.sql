-- STAGING ONLY: schema prerequisites from the existing 20260822 CI, 20260825 venue,
-- 20261004 structural-point, and 20261012 forecast migrations.
-- No CI publication functions, roster backfills or player CI updates are run.
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


create table if not exists public.historical_team_matches (
id bigint generated by default as identity primary key, season_name text not null, event_order integer not null,
event_month text not null,event_label text,away_team_name text not null,home_team_name text not null,
away_score numeric,home_score numeric,source_name text not null,source_authority text not null default 'official_schedule',
created_at timestamptz not null default now(),played_on date,
unique(season_name,event_order,away_team_name,home_team_name));
alter table public.historical_team_matches enable row level security;
grant select on public.historical_team_matches to anon,authenticated;
create policy "public reads historical team matches" on public.historical_team_matches for select to anon,authenticated using(true);
alter table public.clash_match_rating_snapshots
  add column if not exists venue text not null default 'Home';

alter table public.clash_match_rating_snapshots
  drop constraint if exists clash_match_rating_snapshots_venue_check;
alter table public.clash_match_rating_snapshots
  add constraint clash_match_rating_snapshots_venue_check
  check (venue in ('Home', 'Neutral'));

comment on column public.clash_match_rating_snapshots.venue is
  'Frozen CI venue context. Home means scheduled home team owns the actual course; Neutral means it does not. Historical profile changes must not rewrite this value.';

alter table public.clash_contest_rating_facts
  add column if not exists venue text not null default 'Home';

alter table public.clash_contest_rating_facts
  drop constraint if exists clash_contest_rating_facts_venue_check;
alter table public.clash_contest_rating_facts
  add constraint clash_contest_rating_facts_venue_check
  check (venue in ('Home', 'Neutral'));

comment on column public.clash_contest_rating_facts.venue is
  'Venue context frozen with the Matchday CI snapshot. Singles home bonus applies only when venue = Home.';

-- Contest CI movement is public league-statistics data. Publication remains
-- server-only; this policy grants read access only.
drop policy if exists "public reads clash contest rating facts" on public.clash_contest_rating_facts;
create policy "public reads clash contest rating facts"
  on public.clash_contest_rating_facts for select
  to anon, authenticated
  using (true);

-- Historical team matches need an explicit venue because current course/team
-- profiles are not trustworthy evidence for old events.
alter table public.historical_team_matches
  add column if not exists ci_venue text not null default 'Home';

alter table public.historical_team_matches
  drop constraint if exists historical_team_matches_ci_venue_check;
alter table public.historical_team_matches
  add constraint historical_team_matches_ci_venue_check
  check (ci_venue in ('Home', 'Neutral'));

-- Imported playoffs were neutral-site events even though source workbooks use
-- home/away columns to lay out the matchup.
update public.historical_team_matches
set ci_venue = 'Neutral'
where season_name = '2024-2025'
  and event_month = 'April'
  and event_label in ('April Semifinal 1', 'April Semifinal 2', 'April Championship');

update public.historical_team_matches
set ci_venue = 'Neutral'
where season_name = '2025-2026'
  and event_order >= 6
  and event_label in ('March Semifinal 1', 'March Semifinal 2', 'March Championship', 'March 3rd Place');

-- Historical facts intentionally do not reference launch_result_contests or
-- live Matchday snapshots. Historical source rows have their own immutable
-- provenance and must never be faked into the live publication tables.
--
-- historical_team_match_id is nullable because some playoff imports predate the
-- team-match archive. historical_match_key remains mandatory and groups those
-- rows deterministically by season/event/team pair. side may be null only for
-- Neutral facts: playoffs have no true home/away side and CI does not invent one.
create table if not exists public.historical_clash_contest_rating_facts (
  matchup_deduplication_key text primary key
    references public.historical_player_matchups(deduplication_key) on delete restrict,
  contest_id text not null,
  historical_match_key text not null,
  historical_team_match_id bigint null
    references public.historical_team_matches(id) on delete restrict,
  season_id text not null,
  player_id text not null,
  player_name text not null,
  team_id text not null,
  team_name text not null,
  opponent_team_id text not null,
  opponent_team_name text not null,
  side text null check (side in ('Home', 'Away')),
  venue text not null check (venue in ('Home', 'Neutral')),
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
  calculated_at timestamptz not null default now(),
  constraint historical_clash_fact_side_context_check
    check ((venue = 'Home' and side is not null) or venue = 'Neutral')
);

create index if not exists historical_clash_facts_player_idx
  on public.historical_clash_contest_rating_facts(player_id, season_id, historical_match_key);
create index if not exists historical_clash_facts_season_idx
  on public.historical_clash_contest_rating_facts(season_id, player_id);
create index if not exists historical_clash_facts_contest_idx
  on public.historical_clash_contest_rating_facts(contest_id);

alter table public.historical_clash_contest_rating_facts enable row level security;

drop policy if exists "public reads historical clash contest rating facts"
  on public.historical_clash_contest_rating_facts;
create policy "public reads historical clash contest rating facts"
  on public.historical_clash_contest_rating_facts for select
  to anon, authenticated
  using (true);

comment on table public.historical_clash_contest_rating_facts is
  'Immutable historical per-player/per-contest CI facts rebuilt with the current finalized Clash model. Offseason reseeds are never represented as ci_delta.';


-- Finalize Match pipeline:
-- 1) freeze player CI when the official roster snapshot is created;
-- 2) record explicit non-contest scoring adjustments;
-- 3) finalize the persisted draft result and CI facts atomically.

create table if not exists public.launch_match_structural_points (
  id bigint generated by default as identity primary key,
  match_id text not null references public.launch_schedule_matches(id) on delete cascade,
  awarded_team_id text not null references public.launch_teams(id) on delete restrict,
  category text not null check (category in ('NoShow', 'WomenBonus', 'Penalty', 'Other')),
  points numeric not null check (points > 0 and mod(points * 2, 1) = 0),
  note text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, awarded_team_id, category)
);

alter table public.launch_match_structural_points enable row level security;

grant select, insert, update, delete on public.launch_match_structural_points to authenticated;
grant usage, select on sequence public.launch_match_structural_points_id_seq to authenticated;

drop policy if exists "commissioners read match structural points" on public.launch_match_structural_points;
create policy "commissioners read match structural points"
on public.launch_match_structural_points
for select
to authenticated
using ((select private.is_launch_commissioner()));

drop policy if exists "commissioners insert draft match structural points" on public.launch_match_structural_points;
create policy "commissioners insert draft match structural points"
on public.launch_match_structural_points
for insert
to authenticated
with check (
  (select private.is_launch_commissioner())
  and not exists (
    select 1 from public.clash_match_publications publication
    where publication.match_id = launch_match_structural_points.match_id
  )
);

drop policy if exists "commissioners update draft match structural points" on public.launch_match_structural_points;
create policy "commissioners update draft match structural points"
on public.launch_match_structural_points
for update
to authenticated
using (
  (select private.is_launch_commissioner())
  and not exists (
    select 1 from public.clash_match_publications publication
    where publication.match_id = launch_match_structural_points.match_id
  )
)
with check (
  (select private.is_launch_commissioner())
  and not exists (
    select 1 from public.clash_match_publications publication
    where publication.match_id = launch_match_structural_points.match_id
  )
);

drop policy if exists "commissioners delete draft match structural points" on public.launch_match_structural_points;
create policy "commissioners delete draft match structural points"
on public.launch_match_structural_points
for delete
to authenticated
using (
  (select private.is_launch_commissioner())
  and not exists (
    select 1 from public.clash_match_publications publication
    where publication.match_id = launch_match_structural_points.match_id
  )
);


-- First observation wins; completed-match replays are kept out of this table.
create table public.team_strength_prediction_snapshots (
  match_id text not null references public.launch_schedule_matches(id),
  team_id text not null,
  opponent_team_id text not null,
  side text not null,
  source text not null,
  capture_reason text not null,
  strength_label text not null,
  model_version text not null,
  captured_at timestamptz not null,
  venue text not null,
  confidence text not null,
  prediction_readiness text not null,
  calibration_slope double precision not null,
  team_base_strength double precision not null,
  opponent_base_strength double precision not null,
  matchup_strength_difference double precision not null,
  expected_point_share double precision not null,
  chance_of_victory double precision not null,
  team_player_ids text[] not null,
  opponent_player_ids text[] not null,
  team_player_clash_indexes jsonb not null,
  opponent_player_clash_indexes jsonb not null,
  team_player_count double precision not null,
  opponent_player_count double precision not null,
  team_female_player_count double precision not null,
  opponent_female_player_count double precision not null,
  team_male_player_count double precision not null,
  opponent_male_player_count double precision not null,
  team_unknown_gender_player_count double precision not null,
  opponent_unknown_gender_player_count double precision not null,
  team_standard_player_shortfall double precision not null,
  opponent_standard_player_shortfall double precision not null,
  team_provisional_player_count double precision not null,
  opponent_provisional_player_count double precision not null,
  team_fallback_player_count double precision not null,
  opponent_fallback_player_count double precision not null,
  team_omitted_player_count double precision not null,
  opponent_omitted_player_count double precision not null,
  expected_score double precision generated always as (expected_point_share * 36) stored,
  expected_margin double precision generated always as ((2 * expected_point_share - 1) * 36) stored,
  primary key (match_id, side, source, model_version),
  check (team_id <> opponent_team_id),
  check (side in ('Home', 'Away')),
  check (venue in ('Home', 'Away', 'Neutral')),
  check (source in ('activeRoster', 'confirmedAvailableRoster', 'matchLineup')),
  check (chance_of_victory between 0 and 1),
  check (expected_point_share between 0 and 1)
);
alter table public.team_strength_prediction_snapshots enable row level security;
revoke all on public.team_strength_prediction_snapshots from anon, authenticated;
revoke all on public.team_strength_prediction_snapshots from service_role;
grant select, insert on public.team_strength_prediction_snapshots to service_role;
grant select on public.team_strength_prediction_snapshots to authenticated;
create policy "commissioners read saved predictions"
  on public.team_strength_prediction_snapshots for select to authenticated
  using ((select private.is_launch_commissioner()));
-- Historical reconstruction uses the same commissioner-only access as forecasts.
grant select on public.clash_match_rating_snapshots to authenticated;
create policy "commissioners read frozen roster ratings"
  on public.clash_match_rating_snapshots for select to authenticated
  using ((select private.is_launch_commissioner()));
-- No update/delete grant: retries use ON CONFLICT DO NOTHING.
comment on table public.team_strength_prediction_snapshots is
  'Pre-match roster forecasts with frozen player CI. Expected score uses 36 standard points; extra roster penalties are excluded.';


grant select on public.clash_contest_rating_facts,public.historical_clash_contest_rating_facts to anon,authenticated;
grant select on public.clash_match_publications to authenticated;
create policy "commissioners read CI publication ledger" on public.clash_match_publications for select to authenticated using((select private.is_launch_commissioner()));

