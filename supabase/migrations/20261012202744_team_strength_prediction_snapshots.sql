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
