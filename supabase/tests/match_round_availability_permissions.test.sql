begin;

create temporary table tap_diagnostics(result text);
grant select, insert on table tap_diagnostics to anon, authenticated;
insert into tap_diagnostics select plan(10);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'round-player@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'round-captain@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'round-opponent@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'round-commissioner@example.test', '', now(), now(), now(), '', '', '', '');

insert into public.launch_players(id, name, gender, pdga_number, current_team_id, active)
values ('round-availability-player', 'Round Availability Player', 'Male', '', 'dark-knights', true);

insert into public.launch_profiles(id, user_id, display_name, role, status, player_id, captain_team_id)
values
  ('round-profile-player', '20000000-0000-0000-0000-000000000001', 'Round Player', 'Player', 'Approved', 'round-availability-player', null),
  ('round-profile-captain', '20000000-0000-0000-0000-000000000002', 'Round Captain', 'Captain', 'Approved', null, 'dark-knights'),
  ('round-profile-opponent', '20000000-0000-0000-0000-000000000003', 'Round Opponent', 'Captain', 'Approved', null, 'ninjas'),
  ('round-profile-commissioner', '20000000-0000-0000-0000-000000000004', 'Round Commissioner', 'Commissioner', 'Approved', null, null);

insert into public.launch_season_teams(season_id, team_id, added_by)
values ('summer-team-clash-2026', 'dark-knights', 'round-profile-commissioner')
on conflict (season_id, team_id) do nothing;

insert into public.launch_season_roster_memberships(
  season_id, team_id, player_id, roster_category, status, added_by
) values (
  'summer-team-clash-2026', 'dark-knights', 'round-availability-player',
  'Men', 'Active', 'round-profile-commissioner'
);

insert into public.launch_rounds(id, schedule_id, season_id, number, name, date, published)
values ('round-availability-round', 'summer-2026-championship', 'summer-team-clash-2026', 998, 'Round Availability Test', '2099-08-01', true);

insert into public.launch_schedule_matches(
  id, round_id, season_id, home_team_id, away_team_id, course_id, date, time, status, notes
) values (
  'round-availability-match', 'round-availability-round', 'summer-team-clash-2026',
  'dark-knights', 'ninjas', 'castle-hayne-park', '2099-08-01', '09:00', 'Scheduled', ''
);

insert into public.launch_match_attendance(match_id, team_id, player_id, status, updated_by)
values ('round-availability-match', 'dark-knights', 'round-availability-player', 'Playing', 'round-profile-commissioner');

insert into public.launch_match_round_availability(
  match_id, team_id, player_id, singles_available, doubles_available, updated_by
) values (
  'round-availability-match', 'dark-knights', 'round-availability-player', true, false, 'round-profile-commissioner'
);

set local role anon;

insert into tap_diagnostics select throws_ok(
  $$select * from public.launch_match_round_availability$$,
  '42501',
  null,
  'anonymous users cannot read round planning data'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);

insert into tap_diagnostics select is(
  (select count(*)::integer from public.launch_match_round_availability),
  0,
  'ordinary authenticated players cannot read round planning data'
);

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
insert into tap_diagnostics select is(
  (select count(*)::integer from public.launch_match_round_availability),
  0,
  'captains cannot read another team round planning data'
);

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
insert into tap_diagnostics select is(
  (select count(*)::integer from public.launch_match_round_availability),
  1,
  'captains can read their team round planning data'
);

insert into tap_diagnostics select throws_ok(
  $$update public.launch_match_round_availability set singles_available = false, doubles_available = true$$,
  '42501',
  null,
  'captains cannot write planning rows directly'
);

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000004', true);
insert into tap_diagnostics select is(
  (select count(*)::integer from public.launch_match_round_availability),
  1,
  'commissioners can read round planning data'
);

reset role;

insert into tap_diagnostics select throws_ok(
  $$insert into public.launch_match_round_availability(
      match_id, team_id, player_id, singles_available, doubles_available, updated_by
    ) values (
      'round-availability-match', 'dark-knights', 'round-availability-player', true, true, 'round-profile-commissioner'
    ) on conflict (match_id, player_id) do update
      set singles_available = excluded.singles_available,
          doubles_available = excluded.doubles_available$$,
  '23514',
  null,
  'both-available rows are rejected so storage stays sparse'
);

insert into tap_diagnostics select throws_ok(
  $$update public.launch_match_round_availability
    set singles_available = false, doubles_available = false
    where match_id = 'round-availability-match'$$,
  '23514',
  null,
  'both rounds cannot be unavailable'
);

update public.launch_match_attendance
set status = 'NotPlaying'
where match_id = 'round-availability-match' and player_id = 'round-availability-player';

insert into tap_diagnostics select is(
  (select count(*)::integer from public.launch_match_round_availability),
  0,
  'changing attendance to NotPlaying removes the round exception'
);

delete from public.launch_match_attendance
where match_id = 'round-availability-match' and player_id = 'round-availability-player';

insert into tap_diagnostics select is(
  (select count(*)::integer from public.launch_match_round_availability),
  0,
  'deleting attendance leaves no round exception'
);

insert into tap_diagnostics select * from finish();
select * from tap_diagnostics;
rollback;
