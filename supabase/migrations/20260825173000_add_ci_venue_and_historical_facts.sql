-- CI venue classification and historical CI ledger.
-- Live matches classify venue from the actual course owner. Historical matches
-- never consult today's team/course profile: known neutral matches are tagged
-- explicitly and replayed from their recorded context.

-- Canonicalize course ownership where the existing team home-course profile is
-- an unambiguous case-insensitive name match. This makes future CI venue checks
-- ID-based rather than dependent on display text.
with matches as (
  select c.id as course_id, min(t.id) as team_id, count(*) as team_count
  from public.launch_courses c
  join public.launch_teams t
    on lower(btrim(t.home_course)) = lower(btrim(c.name))
  where c.home_team_id is null
    and t.home_course is not null
    and btrim(t.home_course) <> ''
  group by c.id
)
update public.launch_courses c
set home_team_id = m.team_id
from matches m
where c.id = m.course_id
  and m.team_count = 1
  and c.home_team_id is null;

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

-- Historical team matches need an explicit venue because current course/team
-- profiles are not trustworthy evidence for old events.
alter table public.historical_team_matches
  add column if not exists ci_venue text not null default 'Home';

alter table public.historical_team_matches
  drop constraint if exists historical_team_matches_ci_venue_check;
alter table public.historical_team_matches
  add constraint historical_team_matches_ci_venue_check
  check (ci_venue in ('Home', 'Neutral'));

-- Imported April 2025 playoffs were neutral-site events even though the source
-- workbook uses home/away columns to lay out the matchup.
update public.historical_team_matches
set ci_venue = 'Neutral'
where season_name = '2024-2025'
  and event_month = 'April'
  and event_label in ('April Semifinal 1', 'April Semifinal 2', 'April Championship');

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

comment on table public.historical_clash_contest_rating_facts is
  'Immutable historical per-player/per-contest CI facts rebuilt with the current finalized Clash model. Offseason reseeds are never represented as ci_delta.';
