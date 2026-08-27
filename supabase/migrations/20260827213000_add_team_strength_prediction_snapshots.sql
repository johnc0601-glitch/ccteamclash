-- Point-in-time roster-stage prediction snapshots for Team Strength V1.
--
-- The historical archive tells us who actually played, but it does not preserve
-- exact Active Roster or attendance-state inputs from before old matches. That
-- makes stage-specific calibration weaker than it should be. These internal
-- snapshots preserve the inputs needed to validate future seasons honestly,
-- including gender composition and the raw 18-player shortfall needed to study
-- structural Clash scoring without reconstructing it later.

create table if not exists public.team_strength_prediction_snapshots (
  id bigint generated always as identity primary key,
  match_id text not null references public.launch_schedule_matches(id) on delete cascade,
  team_id text not null references public.launch_teams(id) on delete restrict,
  opponent_team_id text not null references public.launch_teams(id) on delete restrict,
  side text not null check (side in ('Home', 'Away')),
  source text not null check (source in ('activeRoster', 'confirmedAvailableRoster', 'matchLineup')),
  capture_reason text not null check (capture_reason in ('PreMatch', 'AttendanceFinal', 'RosterLock')),
  strength_label text not null,
  model_version text not null,
  captured_at timestamptz not null default now(),
  venue text not null check (venue in ('Home', 'Neutral', 'Away')),
  confidence text not null check (confidence in ('Low', 'Partial', 'Full')),
  prediction_readiness text not null check (prediction_readiness in ('Unavailable', 'EarlyEstimate', 'Ready')),
  calibration_slope numeric not null check (calibration_slope > 0),
  team_base_strength numeric not null,
  opponent_base_strength numeric not null,
  matchup_strength_difference numeric not null,
  expected_point_share numeric not null check (expected_point_share between 0 and 1),
  chance_of_victory numeric not null check (chance_of_victory between 0 and 1),
  team_player_ids jsonb not null check (jsonb_typeof(team_player_ids) = 'array'),
  opponent_player_ids jsonb not null check (jsonb_typeof(opponent_player_ids) = 'array'),
  team_player_count integer not null check (team_player_count >= 0),
  opponent_player_count integer not null check (opponent_player_count >= 0),
  team_female_player_count integer not null check (team_female_player_count >= 0),
  opponent_female_player_count integer not null check (opponent_female_player_count >= 0),
  team_male_player_count integer not null check (team_male_player_count >= 0),
  opponent_male_player_count integer not null check (opponent_male_player_count >= 0),
  team_unknown_gender_player_count integer not null check (team_unknown_gender_player_count >= 0),
  opponent_unknown_gender_player_count integer not null check (opponent_unknown_gender_player_count >= 0),
  team_standard_player_shortfall integer not null check (team_standard_player_shortfall >= 0),
  opponent_standard_player_shortfall integer not null check (opponent_standard_player_shortfall >= 0),
  team_provisional_player_count integer not null check (team_provisional_player_count >= 0),
  opponent_provisional_player_count integer not null check (opponent_provisional_player_count >= 0),
  team_fallback_player_count integer not null check (team_fallback_player_count >= 0),
  opponent_fallback_player_count integer not null check (opponent_fallback_player_count >= 0),
  team_omitted_player_count integer not null check (team_omitted_player_count >= 0),
  opponent_omitted_player_count integer not null check (opponent_omitted_player_count >= 0),
  constraint team_strength_prediction_snapshot_stage_unique
    unique (match_id, side, source, model_version),
  constraint team_strength_prediction_snapshot_distinct_teams
    check (team_id <> opponent_team_id),
  constraint team_strength_prediction_snapshot_source_reason
    check (
      (source = 'activeRoster' and capture_reason = 'PreMatch')
      or (source = 'confirmedAvailableRoster' and capture_reason = 'AttendanceFinal')
      or (source = 'matchLineup' and capture_reason = 'RosterLock')
    ),
  constraint team_strength_prediction_snapshot_team_gender_total
    check (
      team_female_player_count + team_male_player_count + team_unknown_gender_player_count
      = team_player_count
    ),
  constraint team_strength_prediction_snapshot_opponent_gender_total
    check (
      opponent_female_player_count + opponent_male_player_count + opponent_unknown_gender_player_count
      = opponent_player_count
    )
);

create index if not exists team_strength_prediction_snapshots_match_idx
  on public.team_strength_prediction_snapshots(match_id, captured_at);

create index if not exists team_strength_prediction_snapshots_model_idx
  on public.team_strength_prediction_snapshots(model_version, source, captured_at);

alter table public.team_strength_prediction_snapshots enable row level security;

-- Internal calibration history only. Writes/reads are service-role operations;
-- no public or authenticated policy is created.
revoke all on table public.team_strength_prediction_snapshots from anon, authenticated;
grant all on table public.team_strength_prediction_snapshots to service_role;
grant usage, select on sequence public.team_strength_prediction_snapshots_id_seq to service_role;

comment on table public.team_strength_prediction_snapshots is
  'Immutable point-in-time Team Strength roster-stage predictions used for future calibration and prediction auditing.';
comment on column public.team_strength_prediction_snapshots.source is
  'The exact information stage: Active Roster Strength, Confirmed Available Roster Strength, or Match Lineup Strength.';
comment on column public.team_strength_prediction_snapshots.capture_reason is
  'Fixed lifecycle checkpoint used to make snapshots comparable across matches and seasons.';
comment on column public.team_strength_prediction_snapshots.prediction_readiness is
  'Publication gate at capture time: Unavailable, EarlyEstimate, or Ready.';
comment on column public.team_strength_prediction_snapshots.team_player_ids is
  'Exact player-id pool selected for the team-side strength stage at capture time.';
comment on column public.team_strength_prediction_snapshots.opponent_player_ids is
  'Exact opponent player-id pool selected for the strength stage at capture time.';
comment on column public.team_strength_prediction_snapshots.team_female_player_count is
  'Female players in the exact selected team pool; retained for future structural bonus-point calibration.';
comment on column public.team_strength_prediction_snapshots.opponent_female_player_count is
  'Female players in the exact selected opponent pool; retained for future structural bonus-point calibration.';
comment on column public.team_strength_prediction_snapshots.team_standard_player_shortfall is
  'Diagnostic max(0, 18 - selected team player count); not itself an automatic-points award.';
comment on column public.team_strength_prediction_snapshots.opponent_standard_player_shortfall is
  'Diagnostic max(0, 18 - selected opponent player count); not itself an automatic-points award.';
