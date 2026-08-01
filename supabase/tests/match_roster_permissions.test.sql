begin;

select plan(35);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'matchday-player@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'matchday-captain@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'matchday-opponent-captain@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'matchday-commissioner@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'matchday-pending@example.test', '', now(), now(), now(), '', '', '', '');

insert into public.launch_players (
  id, name, gender, pdga_number, current_team_id, active
) values
  ('matchday-player-home', 'Matchday Home Player', 'Unknown', '', 'dark-knights', true),
  ('matchday-player-home-two', 'Matchday Home Player Two', 'Unknown', '', 'dark-knights', true),
  ('matchday-player-away', 'Matchday Away Player', 'Unknown', '', 'ninjas', true),
  ('matchday-player-away-two', 'Matchday Away Player Two', 'Unknown', '', 'ninjas', true),
  ('matchday-player-inactive', 'Matchday Inactive Player', 'Unknown', '', 'dark-knights', false);

insert into public.launch_profiles (
  id, user_id, display_name, role, status, player_id, captain_team_id
) values
  ('matchday-profile-player', '10000000-0000-0000-0000-000000000001', 'Matchday Player', 'Player', 'Approved', 'matchday-player-home', null),
  ('matchday-profile-captain', '10000000-0000-0000-0000-000000000002', 'Matchday Captain', 'Captain', 'Approved', null, 'dark-knights'),
  ('matchday-profile-opponent', '10000000-0000-0000-0000-000000000003', 'Matchday Opponent Captain', 'Captain', 'Approved', null, 'ninjas'),
  ('matchday-profile-commissioner', '10000000-0000-0000-0000-000000000004', 'Matchday Commissioner', 'Commissioner', 'Approved', null, null),
  ('matchday-profile-pending', '10000000-0000-0000-0000-000000000005', 'Matchday Pending', 'Player', 'Pending', 'matchday-player-home-two', null);

insert into public.launch_rounds (
  id, schedule_id, season_id, number, name, date, published
) values
  ('matchday-test-round-future', 'summer-2026-championship', 'summer-team-clash-2026', 901, 'Matchday Test Future', '2099-07-18', true),
  ('matchday-test-round-past', 'summer-2026-championship', 'summer-team-clash-2026', 902, 'Matchday Test Past', '2020-01-18', true);

insert into public.launch_schedule_matches (
  id, round_id, season_id, home_team_id, away_team_id, course_id,
  date, time, status, notes
) values
  ('matchday-test-future', 'matchday-test-round-future', 'summer-team-clash-2026', 'dark-knights', 'ninjas', 'castle-hayne-park', '2099-07-18', '09:00', 'Scheduled', ''),
  ('matchday-test-past', 'matchday-test-round-past', 'summer-team-clash-2026', 'dark-knights', 'ninjas', 'castle-hayne-park', '2020-01-18', '09:00', 'Scheduled', '');

insert into public.launch_match_attendance (
  match_id, team_id, player_id, status, updated_by
) values (
  'matchday-test-future', 'ninjas', 'matchday-player-away-two', 'Playing', 'matchday-profile-commissioner'
);

insert into public.launch_match_attendance (
  match_id, team_id, player_id, status, updated_by
) values (
  'matchday-test-past', 'dark-knights', 'matchday-player-home-two', 'Playing', 'matchday-profile-commissioner'
);

insert into public.launch_match_rosters (
  match_id, team_id, status, confirmed_by, confirmed_at
) values (
  'matchday-test-future', 'ninjas', 'Confirmed', 'matchday-profile-commissioner', now()
);

select is(
  private.launch_match_lock_at('2026-01-15'::date),
  '2026-01-15 20:00:00+00'::timestamptz,
  'winter lock is 3 PM America/New_York'
);

select is(
  private.launch_match_lock_at('2026-07-15'::date),
  '2026-07-15 19:00:00+00'::timestamptz,
  'summer lock is 3 PM America/New_York'
);

select ok(
  private.is_launch_match_attendance_open_at('matchday-test-future', '2099-07-18 18:59:59+00'),
  'attendance is open immediately before the summer lock'
);

select ok(
  not private.is_launch_match_attendance_open_at('matchday-test-future', '2099-07-18 19:00:00+00'),
  'attendance is closed exactly at the summer lock'
);

update public.launch_schedule_matches
set date = '2099-07-19'
where id = 'matchday-test-future';

select ok(
  private.is_launch_match_attendance_open_at('matchday-test-future', '2099-07-18 19:00:00+00'),
  'rescheduling the canonical match date moves the lock'
);

update public.launch_schedule_matches
set date = '2099-07-18'
where id = 'matchday-test-future';

set local role anon;

select is(
  (select count(*)::integer from public.launch_match_attendance where match_id = 'matchday-test-future'),
  1,
  'anonymous users read attendance for published matches'
);

select is(
  (select count(*)::integer from public.launch_match_rosters where match_id = 'matchday-test-future'),
  1,
  'anonymous users read roster state for published matches'
);

select throws_ok(
  $$insert into public.launch_match_attendance
    (match_id, team_id, player_id, status, updated_by)
    values ('matchday-test-future', 'dark-knights', 'matchday-player-home', 'Playing', 'matchday-profile-player')$$,
  '42501',
  null,
  'anonymous users cannot write attendance'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$insert into public.launch_match_attendance
    (match_id, team_id, player_id, status, updated_by)
    values ('matchday-test-future', 'dark-knights', 'matchday-player-home', 'Playing', 'matchday-profile-player')$$,
  'approved player creates own pre-lock attendance'
);

select lives_ok(
  $$update public.launch_match_attendance
    set status = 'NotPlaying', updated_by = 'matchday-profile-player'
    where match_id = 'matchday-test-future' and player_id = 'matchday-player-home'$$,
  'approved player updates own pre-lock attendance'
);

select lives_ok(
  $$delete from public.launch_match_attendance
    where match_id = 'matchday-test-future' and player_id = 'matchday-player-home'$$,
  'approved player deletes own attendance to return to implicit Unconfirmed'
);

select lives_ok(
  $$insert into public.launch_match_attendance
    (match_id, team_id, player_id, status, updated_by)
    values ('matchday-test-future', 'dark-knights', 'matchday-player-home', 'NotPlaying', 'matchday-profile-player')$$,
  'approved player can recreate own attendance after returning to Unconfirmed'
);

select is(
  (with changed as (
    update public.launch_match_attendance
    set status = 'NotPlaying', updated_by = 'matchday-profile-player'
    where match_id = 'matchday-test-future' and player_id = 'matchday-player-away-two'
    returning id
  ) select count(*)::integer from changed),
  0,
  'player cannot update another player attendance'
);

select throws_ok(
  $$insert into public.launch_match_attendance
    (match_id, team_id, player_id, status, updated_by)
    values ('matchday-test-future', 'ninjas', 'matchday-player-away', 'Playing', 'matchday-profile-player')$$,
  '42501',
  null,
  'player cannot create attendance for an opposing player'
);

select throws_ok(
  $$insert into public.launch_match_attendance
    (match_id, team_id, player_id, status, updated_by)
    values ('matchday-test-future', 'dark-knights', 'matchday-player-home-two', 'Playing', 'matchday-profile-player')$$,
  '42501',
  null,
  'player cannot spoof updated_by while managing another player'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000005', true);

select throws_ok(
  $$insert into public.launch_match_attendance
    (match_id, team_id, player_id, status, updated_by)
    values ('matchday-test-future', 'dark-knights', 'matchday-player-home-two', 'Playing', 'matchday-profile-pending')$$,
  '42501',
  null,
  'pending player cannot write attendance'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);

select lives_ok(
  $$insert into public.launch_match_attendance
    (match_id, team_id, player_id, status, updated_by)
    values ('matchday-test-future', 'dark-knights', 'matchday-player-home-two', 'Playing', 'matchday-profile-captain')$$,
  'captain creates attendance for assigned team'
);

select throws_ok(
  $$insert into public.launch_match_attendance
    (match_id, team_id, player_id, status, updated_by)
    values ('matchday-test-future', 'ninjas', 'matchday-player-away', 'Playing', 'matchday-profile-captain')$$,
  '42501',
  null,
  'captain cannot manage opposing team attendance'
);

select throws_ok(
  $$insert into public.launch_match_attendance
    (match_id, team_id, player_id, status, updated_by)
    values ('matchday-test-future', 'dark-knights', 'matchday-player-inactive', 'Playing', 'matchday-profile-captain')$$,
  '42501',
  null,
  'inactive player cannot receive attendance'
);

select lives_ok(
  $$insert into public.launch_match_rosters
    (match_id, team_id, status, confirmed_by, confirmed_at)
    values ('matchday-test-future', 'dark-knights', 'Confirmed', 'matchday-profile-captain', now())$$,
  'captain confirms assigned team roster before lock'
);

select is(
  (with changed as (
    update public.launch_match_rosters
    set status = 'Draft', confirmed_by = null, confirmed_at = null
    where match_id = 'matchday-test-future' and team_id = 'ninjas'
    returning id
  ) select count(*)::integer from changed),
  0,
  'captain cannot change opposing team roster'
);

select throws_ok(
  $$update public.launch_match_rosters
    set confirmed_by = 'matchday-profile-commissioner', confirmed_at = now()
    where match_id = 'matchday-test-future' and team_id = 'dark-knights'$$,
  '42501',
  null,
  'captain cannot spoof roster confirmer'
);

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000004', true);

select lives_ok(
  $$insert into public.launch_match_attendance
    (match_id, team_id, player_id, status, updated_by)
    values ('matchday-test-future', 'ninjas', 'matchday-player-away', 'NotPlaying', 'matchday-profile-commissioner')$$,
  'commissioner manages either team before lock'
);

select throws_ok(
  $$insert into public.launch_match_attendance
    (match_id, team_id, player_id, status, updated_by)
    values ('matchday-test-past', 'dark-knights', 'matchday-player-home', 'Playing', 'matchday-profile-commissioner')$$,
  '42501',
  null,
  'commissioner cannot create live attendance after lock'
);

select is(
  (with changed as (
    update public.launch_match_attendance
    set status = 'NotPlaying', updated_by = 'matchday-profile-commissioner'
    where match_id = 'matchday-test-past' and player_id = 'matchday-player-home-two'
    returning id
  ) select count(*)::integer from changed),
  0,
  'commissioner cannot update live attendance after lock'
);

select is(
  (with removed as (
    delete from public.launch_match_attendance
    where match_id = 'matchday-test-past' and player_id = 'matchday-player-home-two'
    returning id
  ) select count(*)::integer from removed),
  0,
  'commissioner cannot delete live attendance after lock'
);

select throws_ok(
  $$insert into public.launch_match_rosters
    (match_id, team_id, status, confirmed_by, confirmed_at)
    values ('matchday-test-past', 'dark-knights', 'Confirmed', 'matchday-profile-commissioner', now())$$,
  '42501',
  null,
  'commissioner cannot confirm a live roster after lock'
);

reset role;

update public.launch_teams set name = 'Renamed Dark Knights' where id = 'dark-knights';
update public.launch_players set name = 'Renamed Matchday Player' where id = 'matchday-player-home';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);

select lives_ok(
  $$update public.launch_match_attendance
    set status = 'NotPlaying', updated_by = 'matchday-profile-captain'
    where match_id = 'matchday-test-future' and player_id = 'matchday-player-home-two'$$,
  'stable IDs continue authorizing after display-name changes'
);

select throws_ok(
  $$update public.launch_match_attendance
    set match_id = 'matchday-test-past', updated_by = 'matchday-profile-captain'
    where match_id = 'matchday-test-future' and player_id = 'matchday-player-home-two'$$,
  '42501',
  null,
  'attendance identity fields cannot be reassigned'
);

reset role;

select throws_ok(
  $$insert into public.launch_match_attendance
    (match_id, team_id, player_id, status, updated_by)
    values ('matchday-test-future', 'ninjas', 'matchday-player-home', 'Playing', 'matchday-profile-commissioner')$$,
  '23514',
  'Attendance player must be active on the selected team.',
  'database integrity rejects mismatched player and team IDs even outside RLS'
);

select throws_ok(
  $$insert into public.launch_match_rosters
    (match_id, team_id, status, confirmed_by, confirmed_at)
    values ('matchday-test-future', 'beast-mode', 'Draft', null, null)$$,
  '23514',
  'Roster team must participate in the match.',
  'database integrity rejects a roster for an unrelated team'
);

select throws_ok(
  $$update public.launch_match_attendance
    set match_id = 'matchday-test-past'
    where match_id = 'matchday-test-future' and player_id = 'matchday-player-home-two'$$,
  '23514',
  'Match attendance identity fields cannot be changed.',
  'database integrity makes attendance identity fields immutable'
);

select throws_ok(
  $$insert into public.launch_match_attendance
    (match_id, team_id, player_id, status, updated_by)
    values ('matchday-test-future', 'dark-knights', 'matchday-player-home', 'Unconfirmed', 'matchday-profile-player')$$,
  '23514',
  null,
  'Unconfirmed is never stored as an attendance status'
);

select throws_ok(
  $$insert into public.launch_match_rosters
    (match_id, team_id, status, confirmed_by, confirmed_at)
    values ('matchday-test-future', 'dark-knights', 'Confirmed', null, null)$$,
  '23514',
  null,
  'confirmed roster requires confirmer and timestamp'
);

select is(
  (select count(*)::integer
   from information_schema.tables
   where table_schema = 'public'
     and table_name in ('launch_match_roster_snapshot_players', 'attendance_notifications')),
  0,
  'snapshot and notification tables are not created by this patch'
);

select * from finish();
rollback;
