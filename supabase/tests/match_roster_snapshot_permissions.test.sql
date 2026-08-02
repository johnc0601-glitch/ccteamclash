begin;

select plan(54);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'snapshot-player@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'snapshot-captain@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'snapshot-commissioner@example.test', '', now(), now(), now(), '', '', '', '');

insert into public.launch_players (
  id, name, gender, pdga_number, current_team_id, active
) values
  ('snapshot-home-player', 'Snapshot Home Player', 'Unknown', '', 'dark-knights', true),
  ('snapshot-later-player', 'Snapshot Later Player', 'Unknown', '', 'dark-knights', true),
  ('snapshot-away-player', 'Snapshot Away Player', 'Unknown', '', 'ninjas', true);

insert into public.launch_profiles (
  id, user_id, display_name, role, status, player_id, captain_team_id
) values
  ('snapshot-profile-player', '20000000-0000-0000-0000-000000000001', 'Snapshot Player', 'Player', 'Approved', 'snapshot-home-player', null),
  ('snapshot-profile-captain', '20000000-0000-0000-0000-000000000002', 'Snapshot Captain', 'Captain', 'Approved', null, 'dark-knights'),
  ('snapshot-profile-commissioner', '20000000-0000-0000-0000-000000000003', 'Snapshot Commissioner', 'Commissioner', 'Approved', null, null);

insert into public.launch_rounds (
  id, schedule_id, season_id, number, name, date, published
) values
  ('snapshot-round-march', 'summer-2026-championship', 'summer-team-clash-2026', 911, 'Snapshot March DST', '2026-03-08', true),
  ('snapshot-round-november', 'summer-2026-championship', 'summer-team-clash-2026', 912, 'Snapshot November DST', '2026-11-01', true),
  ('snapshot-round-unpublished', 'summer-2026-championship', 'summer-team-clash-2026', 913, 'Snapshot Unpublished', '2026-03-08', false),
  ('snapshot-round-incomplete', 'summer-2026-championship', 'summer-team-clash-2026', 914, 'Snapshot Incomplete', '2026-03-08', true),
  ('snapshot-round-future', 'summer-2026-championship', 'summer-team-clash-2026', 915, 'Snapshot Future', '2099-11-01', true),
  ('snapshot-round-partial', 'summer-2026-championship', 'summer-team-clash-2026', 916, 'Snapshot Partial', '2026-03-08', true);

insert into public.launch_schedule_matches (
  id, round_id, season_id, home_team_id, away_team_id, course_id,
  date, time, status, notes
) values
  ('snapshot-match-march', 'snapshot-round-march', 'summer-team-clash-2026', 'dark-knights', 'ninjas', 'castle-hayne-park', '2026-03-08', '09:00', 'Scheduled', ''),
  ('snapshot-match-november', 'snapshot-round-november', 'summer-team-clash-2026', 'dark-knights', 'ninjas', 'castle-hayne-park', '2026-11-01', '09:00', 'Scheduled', ''),
  ('snapshot-match-unpublished', 'snapshot-round-unpublished', 'summer-team-clash-2026', 'dark-knights', 'ninjas', 'castle-hayne-park', '2026-03-08', '09:00', 'Scheduled', ''),
  ('snapshot-match-incomplete', 'snapshot-round-incomplete', 'summer-team-clash-2026', 'dark-knights', null, 'castle-hayne-park', '2026-03-08', '09:00', 'Scheduled', ''),
  ('snapshot-match-future', 'snapshot-round-future', 'summer-team-clash-2026', 'dark-knights', 'ninjas', 'castle-hayne-park', '2099-11-01', '09:00', 'Scheduled', ''),
  ('snapshot-match-partial', 'snapshot-round-partial', 'summer-team-clash-2026', 'dark-knights', 'ninjas', 'castle-hayne-park', '2026-03-08', '09:00', 'Scheduled', '');

insert into public.launch_match_attendance (
  match_id, team_id, player_id, status, updated_by
) values
  ('snapshot-match-march', 'dark-knights', 'snapshot-home-player', 'Playing', 'snapshot-profile-player'),
  ('snapshot-match-march', 'ninjas', 'snapshot-away-player', 'NotPlaying', 'snapshot-profile-captain');

insert into public.launch_match_rosters (
  match_id, team_id, status, confirmed_by, confirmed_at
) values (
  'snapshot-match-march', 'dark-knights', 'Confirmed', 'snapshot-profile-captain', '2026-03-08 18:00:00+00'
);

insert into public.launch_match_roster_snapshots (
  match_id, team_id, team_name_snapshot, needs_commissioner_review, updated_by, updated_at
) values (
  'snapshot-match-partial', 'dark-knights', 'Partial Team', true, null, '2026-03-08 19:00:00+00'
);

insert into public.launch_match_roster_snapshot_players (
  match_id, team_id, team_name_snapshot, player_id, player_name_snapshot,
  updated_by, updated_at
) values (
  'snapshot-match-partial', 'dark-knights', 'Partial Team', 'snapshot-later-player', 'Partial Player',
  null, '2026-03-08 19:00:00+00'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);

select throws_ok(
  $$select public.commissioner_add_launch_match_roster_snapshot_player(
    'snapshot-match-partial', 'dark-knights', 'snapshot-away-player'
  )$$,
  '42501',
  'Official roster correction is not available.',
  'commissioner add rejects a partial one-manifest snapshot'
);

select throws_ok(
  $$select public.commissioner_remove_launch_match_roster_snapshot_player(
    'snapshot-match-partial', 'dark-knights', 'snapshot-later-player'
  )$$,
  '42501',
  'Official roster correction is not available.',
  'commissioner remove rejects a partial one-manifest snapshot'
);

reset role;

select is(
  (select count(*)::integer from public.launch_match_roster_snapshot_players where match_id = 'snapshot-match-partial'),
  1,
  'partial-snapshot rejection leaves snapshot-player rows unchanged'
);

select ok(
  (select updated_by is null and updated_at = '2026-03-08 19:00:00+00'::timestamptz
   from public.launch_match_roster_snapshots
   where match_id = 'snapshot-match-partial' and team_id = 'dark-knights'),
  'partial-snapshot rejection leaves manifest audit fields unchanged'
);

select is(
  private.launch_match_lock_at('2026-03-08'::date),
  '2026-03-08 19:00:00+00'::timestamptz,
  'March 8 2026 locks at 3 PM Eastern after the DST transition'
);

select is(
  private.launch_match_lock_at('2026-11-01'::date),
  '2026-11-01 20:00:00+00'::timestamptz,
  'November 1 2026 locks at 3 PM Eastern after the DST transition'
);

select ok(
  not private.is_launch_match_snapshot_ready_at('snapshot-match-march', '2026-03-08 18:59:59.999+00'),
  'March snapshot is rejected one millisecond before lock'
);

select ok(
  private.is_launch_match_snapshot_ready_at('snapshot-match-march', '2026-03-08 19:00:00+00'),
  'March snapshot is allowed exactly at lock'
);

select ok(
  private.is_launch_match_snapshot_ready_at('snapshot-match-march', '2026-03-08 19:00:00.001+00'),
  'March snapshot is allowed after lock'
);

select ok(
  not private.is_launch_match_snapshot_ready_at('snapshot-match-november', '2026-11-01 19:59:59.999+00'),
  'November snapshot is rejected one millisecond before lock'
);

select ok(
  private.is_launch_match_snapshot_ready_at('snapshot-match-november', '2026-11-01 20:00:00+00'),
  'November snapshot is allowed exactly at lock'
);

select ok(
  private.is_launch_match_snapshot_ready_at('snapshot-match-november', '2026-11-01 20:00:00.001+00'),
  'November snapshot is allowed after lock'
);

update public.launch_schedule_matches
set date = '2099-11-02'
where id = 'snapshot-match-future';

select ok(
  not private.is_launch_match_snapshot_ready_at('snapshot-match-future', '2099-11-01 20:00:00+00'),
  'rescheduling moves snapshot eligibility away from the original lock'
);

select ok(
  private.is_launch_match_snapshot_ready_at('snapshot-match-future', '2099-11-02 20:00:00+00'),
  'rescheduling uses the new canonical match date lock'
);

select throws_ok(
  $$select public.create_launch_match_roster_snapshot('snapshot-match-future')$$,
  '22023',
  'Match snapshot is not available.',
  'the creator rejects a match before its current lock'
);

select ok(
  has_function_privilege('service_role', 'public.create_launch_match_roster_snapshot(text)', 'EXECUTE'),
  'service_role may execute the creator'
);

select ok(
  not exists (
    select 1
    from pg_catalog.pg_proc procedure
    cross join lateral pg_catalog.aclexplode(
      coalesce(procedure.proacl, pg_catalog.acldefault('f', procedure.proowner))
    ) privilege
    where procedure.oid = 'public.create_launch_match_roster_snapshot(text)'::regprocedure
      and privilege.grantee = 0
      and privilege.privilege_type = 'EXECUTE'
  ),
  'PUBLIC cannot execute the creator'
);

select ok(
  not has_function_privilege('anon', 'public.create_launch_match_roster_snapshot(text)', 'EXECUTE'),
  'anonymous users cannot execute the creator'
);

select ok(
  not has_function_privilege('authenticated', 'public.create_launch_match_roster_snapshot(text)', 'EXECUTE'),
  'authenticated users cannot execute the creator directly'
);

set local role service_role;

select lives_ok(
  $$select public.create_launch_match_roster_snapshot('snapshot-match-march')$$,
  'service_role creates the locked snapshot'
);

reset role;

select is(
  (select count(*)::integer from public.launch_match_roster_snapshots where match_id = 'snapshot-match-march'),
  2,
  'both participating team manifests are committed together'
);

select col_not_null(
  'public',
  'launch_match_roster_snapshots',
  'team_name_snapshot',
  'manifest team names are required after backfill'
);

select is(
  (select count(*)::integer from public.launch_match_roster_snapshots where team_name_snapshot is null),
  0,
  'manifest team-name backfill leaves no null names'
);

select is(
  (select team_name_snapshot from public.launch_match_roster_snapshots where match_id = 'snapshot-match-march' and team_id = 'dark-knights'),
  (select name from public.launch_teams where id = 'dark-knights'),
  'home manifest captures its trusted team name'
);

select is(
  (select team_name_snapshot from public.launch_match_roster_snapshots where match_id = 'snapshot-match-march' and team_id = 'ninjas'),
  (select name from public.launch_teams where id = 'ninjas'),
  'zero-player away manifest captures its trusted team name'
);

select is(
  (select count(*)::integer from public.launch_match_roster_snapshot_players where match_id = 'snapshot-match-march' and team_id = 'dark-knights'),
  1,
  'Playing attendance becomes official snapshot membership'
);

select is(
  (select count(*)::integer from public.launch_match_roster_snapshots where match_id = 'snapshot-match-march' and team_id = 'ninjas'),
  1,
  'a zero-player team still has a completed manifest'
);

select is(
  (select count(*)::integer from public.launch_match_roster_snapshot_players where match_id = 'snapshot-match-march' and team_id = 'ninjas'),
  0,
  'NotPlaying attendance is excluded from the snapshot'
);

select ok(
  not (select needs_commissioner_review from public.launch_match_roster_snapshots where match_id = 'snapshot-match-march' and team_id = 'dark-knights'),
  'captain confirmation clears the review flag for that team'
);

select ok(
  (select needs_commissioner_review from public.launch_match_roster_snapshots where match_id = 'snapshot-match-march' and team_id = 'ninjas'),
  'missing captain confirmation flags that team for commissioner review'
);

select is(
  (select team_name_snapshot from public.launch_match_roster_snapshot_players where match_id = 'snapshot-match-march' and player_id = 'snapshot-home-player'),
  (select name from public.launch_teams where id = 'dark-knights'),
  'snapshot captures the team display name at creation'
);

select is(
  (select player_name_snapshot from public.launch_match_roster_snapshot_players where match_id = 'snapshot-match-march' and player_id = 'snapshot-home-player'),
  'Snapshot Home Player',
  'snapshot captures the player display name at creation'
);

update public.launch_teams set name = 'Snapshot Renamed Team' where id = 'dark-knights';
update public.launch_players
set name = 'Snapshot Renamed Player', current_team_id = 'ninjas'
where id = 'snapshot-home-player';

select isnt(
  (select team_name_snapshot from public.launch_match_roster_snapshot_players where match_id = 'snapshot-match-march' and player_id = 'snapshot-home-player'),
  'Snapshot Renamed Team',
  'later team display-name changes do not rewrite the snapshot'
);

select is(
  (select player_name_snapshot from public.launch_match_roster_snapshot_players where match_id = 'snapshot-match-march' and player_id = 'snapshot-home-player'),
  'Snapshot Home Player',
  'later player display-name changes do not rewrite the snapshot'
);

select is(
  (select team_id from public.launch_match_roster_snapshot_players where match_id = 'snapshot-match-march' and player_id = 'snapshot-home-player'),
  'dark-knights',
  'a later player transfer does not rewrite historical team identity'
);

insert into public.launch_match_attendance (
  match_id, team_id, player_id, status, updated_by
) values (
  'snapshot-match-march', 'dark-knights', 'snapshot-later-player', 'Playing', 'snapshot-profile-captain'
);

delete from public.launch_match_roster_snapshot_players
where match_id = 'snapshot-match-march'
  and player_id = 'snapshot-home-player';

set local role service_role;

select lives_ok(
  $$select public.create_launch_match_roster_snapshot('snapshot-match-march')$$,
  'repeated snapshot generation is idempotent'
);

reset role;

select is(
  (select count(*)::integer from public.launch_match_roster_snapshot_players where match_id = 'snapshot-match-march' and player_id = 'snapshot-later-player'),
  0,
  'retry does not recalculate membership from later attendance'
);

select is(
  (select count(*)::integer from public.launch_match_roster_snapshot_players where match_id = 'snapshot-match-march' and player_id = 'snapshot-home-player'),
  0,
  'retry does not restore a removed snapshot player'
);

select is(
  (select count(*)::integer from public.launch_match_roster_snapshots where match_id = 'snapshot-match-march'),
  2,
  'retry does not duplicate manifests'
);

select isnt(
  (select team_name_snapshot from public.launch_match_roster_snapshots where match_id = 'snapshot-match-march' and team_id = 'dark-knights'),
  'Snapshot Renamed Team',
  'retry does not refresh the stored manifest team name'
);

insert into public.launch_match_roster_snapshots (
  match_id, team_id, team_name_snapshot, needs_commissioner_review
) values
  ('snapshot-match-unpublished', 'dark-knights', 'Unpublished Home', true),
  ('snapshot-match-unpublished', 'ninjas', 'Unpublished Away', true);

insert into public.launch_match_roster_snapshot_players (
  match_id, team_id, team_name_snapshot, player_id, player_name_snapshot
) values (
  'snapshot-match-unpublished', 'dark-knights', 'Unpublished Team', 'snapshot-later-player', 'Unpublished Player'
);

set local role anon;

select is(
  (select count(*)::integer from public.launch_match_roster_snapshots where match_id = 'snapshot-match-unpublished'),
  0,
  'anonymous users cannot read unpublished snapshot manifests'
);

select is(
  (select count(*)::integer from public.launch_match_roster_snapshot_players where match_id = 'snapshot-match-unpublished'),
  0,
  'anonymous users cannot read unpublished snapshot players'
);

select throws_ok(
  $$insert into public.launch_match_roster_snapshots (match_id, team_id, needs_commissioner_review)
    values ('snapshot-match-march', 'beast-mode', true)$$,
  '42501',
  null,
  'anonymous users cannot write snapshot manifests'
);

select throws_ok(
  $$insert into public.launch_match_roster_snapshot_players
    (match_id, team_id, team_name_snapshot, player_id, player_name_snapshot)
    values ('snapshot-match-march', 'dark-knights', 'Spoofed Team', 'snapshot-later-player', 'Spoofed Player')$$,
  '42501',
  null,
  'anonymous users cannot write snapshot players'
);

select throws_ok(
  $$select public.create_launch_match_roster_snapshot('snapshot-match-march')$$,
  '42501',
  null,
  'anonymous users cannot call the creator directly'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);

select throws_ok(
  $$insert into public.launch_match_roster_snapshots (match_id, team_id, needs_commissioner_review)
    values ('snapshot-match-march', 'beast-mode', true)$$,
  '42501',
  null,
  'players cannot write snapshot manifests'
);

select throws_ok(
  $$insert into public.launch_match_roster_snapshot_players
    (match_id, team_id, team_name_snapshot, player_id, player_name_snapshot)
    values ('snapshot-match-march', 'dark-knights', 'Spoofed Team', 'snapshot-later-player', 'Spoofed Player')$$,
  '42501',
  null,
  'players cannot write snapshot players'
);

select throws_ok(
  $$select public.create_launch_match_roster_snapshot('snapshot-match-march')$$,
  '42501',
  null,
  'players cannot call the creator directly'
);

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);

select throws_ok(
  $$insert into public.launch_match_roster_snapshots (match_id, team_id, needs_commissioner_review)
    values ('snapshot-match-march', 'beast-mode', true)$$,
  '42501',
  null,
  'captains cannot write snapshot manifests'
);

select throws_ok(
  $$insert into public.launch_match_roster_snapshot_players
    (match_id, team_id, team_name_snapshot, player_id, player_name_snapshot)
    values ('snapshot-match-march', 'dark-knights', 'Spoofed Team', 'snapshot-later-player', 'Spoofed Player')$$,
  '42501',
  null,
  'captains cannot write snapshot players'
);

select throws_ok(
  $$select public.create_launch_match_roster_snapshot('snapshot-match-march')$$,
  '42501',
  null,
  'captains cannot call the creator directly'
);

reset role;

select throws_ok(
  $$select public.create_launch_match_roster_snapshot('snapshot-match-unpublished')$$,
  '22023',
  'Match snapshot is not available.',
  'the creator rejects unpublished matches'
);

set local role service_role;

select throws_ok(
  $$select public.create_launch_match_roster_snapshot('snapshot-match-incomplete')$$,
  '22023',
  'Match snapshot is not available.',
  'the creator rejects incomplete participating-team identity'
);

reset role;

select is(
  (select count(*)::integer from public.launch_match_roster_snapshots where match_id = 'snapshot-match-incomplete'),
  0,
  'a failed creator call commits neither team manifest'
);

select * from finish();
rollback;
