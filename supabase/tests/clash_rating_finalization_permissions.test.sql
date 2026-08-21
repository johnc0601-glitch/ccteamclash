begin;

select plan(10);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'clash-rating-player@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'clash-rating-commissioner@example.test', '', now(), now(), now(), '', '', '', '');

insert into public.launch_players (
  id, name, gender, pdga_number, pdga_rating, current_team_id, active, clash_index
) values
  ('clash-rating-test-home', 'Clash Rating Test Home', 'Male', '', 900, 'dark-knights', true, 900),
  ('clash-rating-test-away', 'Clash Rating Test Away', 'Male', '', 900, 'ninjas', true, 900);

insert into public.launch_profiles (
  id, user_id, display_name, role, status, player_id, captain_team_id
) values
  ('clash-rating-test-player-profile', '20000000-0000-0000-0000-000000000001', 'Clash Rating Test Player', 'Player', 'Approved', 'clash-rating-test-home', null),
  ('clash-rating-test-commissioner-profile', '20000000-0000-0000-0000-000000000002', 'Clash Rating Test Commissioner', 'Commissioner', 'Approved', null, null);

insert into public.launch_seasons (
  id, league_id, name, year, start_date, end_date, active, published, archived, registration_open
) values (
  'clash-rating-test-season', 'cc-team-clash', 'Clash Rating Test Season', 2099, '2099-01-01', '2099-12-31', false, true, false, false
);

insert into public.launch_schedules (
  id, season_id, name, description, published
) values (
  'clash-rating-test-schedule', 'clash-rating-test-season', 'Clash Rating Test Schedule', '', true
);

insert into public.launch_rounds (
  id, schedule_id, season_id, number, name, date, published
) values
  ('clash-rating-test-round-1', 'clash-rating-test-schedule', 'clash-rating-test-season', 1, 'Round 1', '2099-01-10', true),
  ('clash-rating-test-round-2', 'clash-rating-test-schedule', 'clash-rating-test-season', 2, 'Round 2', '2099-02-10', true);

insert into public.launch_schedule_matches (
  id, round_id, season_id, home_team_id, away_team_id, course_id,
  date, time, status, notes
) values
  ('clash-rating-test-match-1', 'clash-rating-test-round-1', 'clash-rating-test-season', 'dark-knights', 'ninjas', null, '2099-01-10', '09:00', 'Completed', ''),
  ('clash-rating-test-match-2', 'clash-rating-test-round-2', 'clash-rating-test-season', 'dark-knights', 'ninjas', null, '2099-02-10', '09:00', 'Completed', '');

select ok(
  not has_function_privilege('anon', 'public.finalize_clash_rating_event(text,text,integer,text,text,jsonb,jsonb)', 'EXECUTE'),
  'anonymous users cannot execute Clash finalization RPC'
);

select ok(
  not has_function_privilege('anon', 'public.prepare_clash_rating_correction(text)', 'EXECUTE'),
  'anonymous users cannot execute Clash correction RPC'
);

select ok(
  has_table_privilege('anon', 'public.clash_rating_latest_changes', 'SELECT'),
  'anonymous users may read only the public rating movement table'
);

select ok(
  not has_table_privilege('anon', 'public.clash_rating_event_players', 'SELECT'),
  'anonymous users cannot read event rating snapshots'
);

select ok(
  not has_table_privilege('anon', 'public.clash_rating_ledger', 'SELECT'),
  'anonymous users cannot read the rating ledger'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);

select throws_ok(
  $$select public.prepare_clash_rating_correction('clash-rating-test-round-1')$$,
  '42501',
  null,
  'approved players cannot prepare a Clash rating correction'
);

reset role;

insert into public.clash_rating_event_players (
  season_id, event_key, event_order, event_label, player_id, algorithm_version,
  rating_before, singles_delta, doubles_delta, provisional_adjustment, rating_after,
  rated_results_before, rated_results_after, provisional_events_before, provisional_events_after,
  provisional_before, provisional_after
) values
  ('clash-rating-test-season', 'clash-rating-test-round-1', 1, 'Round 1', 'clash-rating-test-home', 'CR-2026-v1', 900, 5, 0, 0, 905, 0, 1, 0, 0, false, false),
  ('clash-rating-test-season', 'clash-rating-test-round-2', 2, 'Round 2', 'clash-rating-test-home', 'CR-2026-v1', 905, -3, 0, 0, 902, 1, 2, 0, 0, false, false);

select is(
  (select rating_change from public.clash_rating_latest_changes
   where season_id = 'clash-rating-test-season' and player_id = 'clash-rating-test-home'),
  -3,
  'public movement reflects the latest finalized event'
);

delete from public.clash_rating_event_players
where season_id = 'clash-rating-test-season'
  and event_key = 'clash-rating-test-round-2'
  and player_id = 'clash-rating-test-home';

select is(
  (select rating_change from public.clash_rating_latest_changes
   where season_id = 'clash-rating-test-season' and player_id = 'clash-rating-test-home'),
  5,
  'public movement rewinds to the prior valid event when later ratings are invalidated'
);

select is(
  (select rating from public.clash_rating_season_starts
   where season_id = 'clash-rating-test-season'
     and player_id = 'clash-rating-test-home'
     and algorithm_version = 'CR-2026-v1'),
  900,
  'first finalized appearance freezes the season-start rating'
);

insert into public.launch_match_results (
  match_id, home_score, away_score, status, published_at, reopened_at, created_at, updated_at
) values (
  'clash-rating-test-match-2', 1, 0, 'Draft', null, null, now(), now()
);

delete from public.launch_match_results where match_id = 'clash-rating-test-match-2';

select throws_ok(
  $$insert into public.launch_match_results (
      match_id, home_score, away_score, status, published_at, reopened_at, created_at, updated_at
    ) values (
      'clash-rating-test-match-1', 1, 0, 'Draft', null, null, now(), now()
    )$$,
  '23514',
  null,
  'normal result writes are blocked after that event is rating-finalized'
);

select * from finish();
rollback;
