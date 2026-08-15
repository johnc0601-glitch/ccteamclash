begin;

select plan(20);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', '83000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'eligibility-player@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '83000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'eligibility-captain@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '83000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'eligibility-commissioner@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '83000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'eligibility-pending@example.test', '', now(), now(), now(), '', '', '', '');

insert into public.launch_players(id, name, current_team_id, active) values
  ('eligibility-active', 'Eligibility Active', 'cougar-country', true),
  ('eligibility-dropped', 'Eligibility Dropped', 'beast-mode', true),
  ('eligibility-missing', 'Eligibility Missing', 'beast-mode', true),
  ('eligibility-wrong-season', 'Eligibility Wrong Season', 'beast-mode', true),
  ('eligibility-wrong-team', 'Eligibility Wrong Team', 'beast-mode', true),
  ('eligibility-inactive', 'Eligibility Inactive', 'beast-mode', true),
  ('eligibility-away', 'Eligibility Away', 'cougar-country', true);

insert into public.launch_profiles(id, user_id, display_name, role, status, player_id, captain_team_id) values
  ('eligibility-player-profile', '83000000-0000-0000-0000-000000000001', 'Eligibility Player', 'Player', 'Approved', 'eligibility-active', null),
  ('eligibility-captain-profile', '83000000-0000-0000-0000-000000000002', 'Eligibility Captain', 'Captain', 'Approved', null, 'beast-mode'),
  ('eligibility-commissioner-profile', '83000000-0000-0000-0000-000000000003', 'Eligibility Commissioner', 'Commissioner', 'Approved', null, null),
  ('eligibility-pending-profile', '83000000-0000-0000-0000-000000000004', 'Eligibility Pending', 'Captain', 'Pending', null, 'beast-mode');

insert into public.launch_seasons(
  id, league_id, name, year, start_date, end_date, published, mens_roster_cap
) values
  ('eligibility-season', 'cc-team-clash', 'Eligibility Season', 2098, '2098-01-01', '2098-12-31', true, 25),
  ('eligibility-other-season', 'cc-team-clash', 'Eligibility Other Season', 2099, '2099-01-01', '2099-12-31', true, 25);

insert into public.launch_season_teams(season_id, team_id, added_by) values
  ('eligibility-season', 'beast-mode', 'eligibility-commissioner-profile'),
  ('eligibility-season', 'cougar-country', 'eligibility-commissioner-profile'),
  ('eligibility-other-season', 'beast-mode', 'eligibility-commissioner-profile');

insert into public.launch_season_roster_memberships(
  season_id, team_id, player_id, roster_category, status, added_by,
  dropped_by, dropped_at
) values
  ('eligibility-season', 'beast-mode', 'eligibility-active', 'Men', 'Active', 'eligibility-commissioner-profile', null, null),
  ('eligibility-season', 'beast-mode', 'eligibility-dropped', 'Men', 'Dropped', 'eligibility-commissioner-profile', 'eligibility-commissioner-profile', now()),
  ('eligibility-other-season', 'beast-mode', 'eligibility-wrong-season', 'Men', 'Active', 'eligibility-commissioner-profile', null, null),
  ('eligibility-season', 'cougar-country', 'eligibility-wrong-team', 'Men', 'Active', 'eligibility-commissioner-profile', null, null),
  ('eligibility-season', 'beast-mode', 'eligibility-inactive', 'Men', 'Active', 'eligibility-commissioner-profile', null, null),
  ('eligibility-season', 'cougar-country', 'eligibility-away', 'Men', 'Active', 'eligibility-commissioner-profile', null, null);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '83000000-0000-0000-0000-000000000003', true);
update public.launch_players
set active = false
where id = 'eligibility-inactive';
reset role;

insert into public.launch_schedules(id, season_id, name, published) values
  ('eligibility-schedule', 'eligibility-season', 'Eligibility Schedule', true);
insert into public.launch_rounds(id, schedule_id, season_id, number, name, date, published) values
  ('eligibility-round', 'eligibility-schedule', 'eligibility-season', 1, 'Eligibility Round', '2098-08-15', true);
insert into public.launch_schedule_matches(
  id, round_id, season_id, home_team_id, away_team_id, course_id, date, time, status
) values
  ('eligibility-open-match', 'eligibility-round', 'eligibility-season', 'beast-mode', 'cougar-country', 'castle-hayne-park', '2098-08-15', '09:00', 'Scheduled'),
  ('eligibility-locked-match', 'eligibility-round', 'eligibility-season', 'beast-mode', 'cougar-country', 'castle-hayne-park', '2020-08-15', '09:00', 'Scheduled');

select ok(private.is_launch_player_eligible_for_match_team('eligibility-open-match', 'eligibility-active', 'beast-mode'), 'active same-season membership permits attendance');
select ok(not private.is_launch_player_eligible_for_match_team('eligibility-open-match', 'eligibility-missing', 'beast-mode'), 'missing membership is denied');
select ok(not private.is_launch_player_eligible_for_match_team('eligibility-open-match', 'eligibility-dropped', 'beast-mode'), 'dropped membership is denied');
select ok(not private.is_launch_player_eligible_for_match_team('eligibility-open-match', 'eligibility-wrong-season', 'beast-mode'), 'wrong-season membership is denied');
select ok(not private.is_launch_player_eligible_for_match_team('eligibility-open-match', 'eligibility-wrong-team', 'beast-mode'), 'membership team mismatch is denied');
select ok(private.is_launch_player_eligible_for_match_team('eligibility-open-match', 'eligibility-active', 'beast-mode'), 'current team mismatch does not invalidate membership');
select ok(not private.is_launch_player_eligible_for_match_team('eligibility-open-match', 'eligibility-missing', 'beast-mode'), 'matching current team cannot replace membership');
select ok(not private.is_launch_player_eligible_for_match_team('eligibility-open-match', 'eligibility-inactive', 'beast-mode'), 'globally inactive player is denied');

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '83000000-0000-0000-0000-000000000002', true);
select lives_ok(
  $$insert into public.launch_match_attendance(match_id, team_id, player_id, status, updated_by)
    values ('eligibility-open-match', 'beast-mode', 'eligibility-active', 'Playing', 'eligibility-captain-profile')$$,
  'captain can manage an eligible active member of the assigned participating team'
);
select throws_ok(
  $$insert into public.launch_match_attendance(match_id, team_id, player_id, status, updated_by)
    values ('eligibility-open-match', 'cougar-country', 'eligibility-away', 'Playing', 'eligibility-captain-profile')$$,
  '42501', null, 'captain cannot manage the opposing team'
);

select set_config('request.jwt.claim.sub', '83000000-0000-0000-0000-000000000003', true);
select lives_ok(
  $$insert into public.launch_match_attendance(match_id, team_id, player_id, status, updated_by)
    values ('eligibility-open-match', 'cougar-country', 'eligibility-away', 'Playing', 'eligibility-commissioner-profile')$$,
  'commissioner can manage an eligible active member of either participating team'
);

select set_config('request.jwt.claim.sub', '83000000-0000-0000-0000-000000000004', true);
update public.launch_match_attendance
set status = 'NotPlaying', updated_by = 'eligibility-pending-profile'
where match_id = 'eligibility-open-match' and player_id = 'eligibility-active';
select is(
  (select status from public.launch_match_attendance
    where match_id = 'eligibility-open-match' and player_id = 'eligibility-active'),
  'Playing', 'inactive profile cannot modify attendance'
);

reset role;
insert into public.launch_match_attendance(match_id, team_id, player_id, status, updated_by)
values ('eligibility-locked-match', 'beast-mode', 'eligibility-active', 'Playing', 'eligibility-commissioner-profile');
insert into public.launch_match_roster_snapshots(match_id, team_id, team_name_snapshot)
values ('eligibility-locked-match', 'beast-mode', 'Beast Mode');
insert into public.launch_match_roster_snapshot_players(
  match_id, team_id, team_name_snapshot, player_id, player_name_snapshot
) values ('eligibility-locked-match', 'beast-mode', 'Beast Mode', 'eligibility-active', 'Eligibility Active');
insert into public.launch_match_results(match_id, home_score, away_score, status)
values ('eligibility-locked-match', null, null, 'Draft');

set local role authenticated;
select set_config('request.jwt.claim.sub', '83000000-0000-0000-0000-000000000003', true);
select lives_ok(
  $$select public.drop_launch_season_roster_member('eligibility-season', 'eligibility-active')$$,
  'commissioner can drop the active member'
);
reset role;

select is((select count(*)::integer from public.launch_match_attendance where match_id = 'eligibility-open-match' and player_id = 'eligibility-active'), 0, 'drop removes future unlocked attendance');
select is((select count(*)::integer from public.launch_match_attendance where match_id = 'eligibility-locked-match' and player_id = 'eligibility-active'), 1, 'drop preserves locked attendance');
select is((select count(*)::integer from public.launch_match_roster_snapshot_players where match_id = 'eligibility-locked-match' and player_id = 'eligibility-active'), 1, 'drop preserves snapshot rows');
select is((select count(*)::integer from public.launch_match_results where match_id = 'eligibility-locked-match'), 1, 'drop preserves results and history');

set local role authenticated;
select set_config('request.jwt.claim.sub', '83000000-0000-0000-0000-000000000003', true);
select throws_ok(
  $$insert into public.launch_match_attendance(match_id, team_id, player_id, status, updated_by)
    values ('eligibility-open-match', 'beast-mode', 'eligibility-active', 'Playing', 'eligibility-commissioner-profile')$$,
  '23514', 'Attendance player is not eligible for the selected match team.',
  'dropped membership cannot receive new attendance'
);
reset role;

select ok(
  pg_get_functiondef('private.is_launch_player_eligible_for_match_team(text,text,text)'::regprocedure) ilike '%pg_advisory_xact_lock%'
  and pg_get_functiondef('public.drop_launch_season_roster_member(text,text)'::regprocedure) ilike '%pg_advisory_xact_lock%',
  'attendance and drop paths share deterministic transaction-scoped locking'
);
select ok(
  not has_function_privilege('anon', 'private.is_launch_player_eligible_for_match_team(text,text,text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.drop_launch_season_roster_member(text,text)', 'EXECUTE'),
  'anonymous users cannot execute eligibility or drop mutations'
);

select * from finish();
rollback;
