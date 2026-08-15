begin;

select plan(24);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  '80000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'season-rules-commissioner@example.test', '',
  now(), now(), now(), '', '', '', ''
);

insert into public.launch_profiles (
  id, user_id, display_name, role, status, player_id, captain_team_id
) values (
  'season-rules-commissioner-profile',
  '80000000-0000-0000-0000-000000000001',
  'Season Rules Commissioner', 'Commissioner', 'Approved', null, null
);

insert into public.launch_seasons (
  id, league_id, name, year, description, start_date, end_date,
  registration_open, active, published, archived
) values
  ('season-rules-defaults', 'cc-team-clash', 'Season Rules Defaults', 2098, '', '2098-01-01', '2098-12-31', false, false, false, false),
  ('season-rules-summer', 'cc-team-clash', 'Season Rules Summer', 2099, '', '2099-01-01', '2099-12-31', false, false, true, false),
  ('season-rules-winter', 'cc-team-clash', 'Season Rules Winter', 2097, '', '2097-01-01', '2097-12-31', false, false, true, false),
  ('season-rules-permanent', 'cc-team-clash', 'Season Rules Permanent', 2020, '', '2020-01-01', '2020-12-31', false, false, true, false),
  ('season-rules-client-marker', 'cc-team-clash', 'Season Rules Client Marker', 2096, '', '2096-01-01', '2096-12-31', false, false, true, false);

select is(
  (select mens_roster_cap from public.launch_seasons where id = 'season-rules-defaults'),
  25,
  'men roster cap defaults to 25'
);
select is(
  (select womens_roster_cap from public.launch_seasons where id = 'season-rules-defaults'),
  null::integer,
  'women roster cap defaults to unlimited'
);
select is(
  (select junior_roster_cap from public.launch_seasons where id = 'season-rules-defaults'),
  null::integer,
  'junior roster cap defaults to unlimited'
);

select throws_ok(
  $$update public.launch_seasons set mens_roster_cap = 0 where id = 'season-rules-defaults'$$,
  '23514', null, 'zero men roster cap is rejected'
);
select throws_ok(
  $$update public.launch_seasons set womens_roster_cap = 0 where id = 'season-rules-defaults'$$,
  '23514', null, 'zero women roster cap is rejected'
);
select throws_ok(
  $$update public.launch_seasons set junior_roster_cap = -1 where id = 'season-rules-defaults'$$,
  '23514', null, 'negative junior roster cap is rejected'
);

insert into public.launch_schedules (id, season_id, name, description, published)
values
  ('season-rules-summer-schedule', 'season-rules-summer', 'Summer Schedule', '', true),
  ('season-rules-winter-schedule', 'season-rules-winter', 'Winter Schedule', '', true),
  ('season-rules-permanent-schedule', 'season-rules-permanent', 'Permanent Schedule', '', false);

insert into public.launch_rounds (id, schedule_id, season_id, number, name, date, published)
values
  ('season-rules-summer-round', 'season-rules-summer-schedule', 'season-rules-summer', 1, 'Summer Round', '2099-07-10', true),
  ('season-rules-summer-unpublished-round', 'season-rules-summer-schedule', 'season-rules-summer', 2, 'Unpublished Round', '2099-06-01', false),
  ('season-rules-winter-round', 'season-rules-winter-schedule', 'season-rules-winter', 1, 'Winter Round', '2097-01-10', true),
  ('season-rules-permanent-round', 'season-rules-permanent-schedule', 'season-rules-permanent', 1, 'Permanent Round', '2020-07-10', false);

insert into public.launch_schedule_matches (
  id, round_id, season_id, home_team_id, away_team_id, course_id,
  date, time, status, notes
) values
  ('season-rules-summer-cancelled', 'season-rules-summer-round', 'season-rules-summer', 'beast-mode', 'cougar-country', 'castle-hayne-park', '2099-06-10', '10:00', 'Cancelled', ''),
  ('season-rules-summer-postponed', 'season-rules-summer-round', 'season-rules-summer', 'beast-mode', 'cougar-country', 'castle-hayne-park', '2099-06-11', '10:00', 'Postponed', ''),
  ('season-rules-summer-unpublished', 'season-rules-summer-unpublished-round', 'season-rules-summer', 'beast-mode', 'cougar-country', 'castle-hayne-park', '2099-06-01', '10:00', 'Scheduled', ''),
  ('season-rules-summer-playoff', 'season-rules-summer-round', 'season-rules-summer', 'beast-mode', 'cougar-country', 'castle-hayne-park', '2099-06-12', '10:00', 'Scheduled', ''),
  ('season-rules-summer-scheduled', 'season-rules-summer-round', 'season-rules-summer', 'beast-mode', 'cougar-country', 'castle-hayne-park', '2099-07-10', '15:00', 'Scheduled', ''),
  ('season-rules-summer-rain-delay', 'season-rules-summer-round', 'season-rules-summer', 'beast-mode', 'cougar-country', 'castle-hayne-park', '2099-08-10', '15:00', 'Rain Delay', ''),
  ('season-rules-winter-completed', 'season-rules-winter-round', 'season-rules-winter', 'beast-mode', 'cougar-country', 'castle-hayne-park', '2097-01-10', '15:00', 'Completed', ''),
  ('season-rules-permanent-match', 'season-rules-permanent-round', 'season-rules-permanent', 'beast-mode', 'cougar-country', 'castle-hayne-park', '2020-07-10', '15:00', 'Scheduled', '');

insert into public.launch_playoff_brackets (
  id, season_id, status, regular_season_locked_at
) values (
  'season-rules-playoff-bracket', 'season-rules-summer', 'Draft', '2099-06-01T00:00:00Z'
);
insert into public.launch_playoff_games (
  id, bracket_id, stage, position, match_id, home_seed, away_seed
) values (
  'season-rules-playoff-game', 'season-rules-playoff-bracket', 'Semifinal', 1,
  'season-rules-summer-playoff', 1, 4
);

select is(
  private.launch_season_roster_rules_lock_at('season-rules-summer'),
  '2099-07-10 19:00:00+00'::timestamptz,
  'summer match start uses America/New_York daylight time and excludes ineligible matches'
);
select is(
  private.launch_season_roster_rules_lock_at('season-rules-winter'),
  '2097-01-10 20:00:00+00'::timestamptz,
  'winter match start uses America/New_York standard time'
);
select ok(
  not private.is_launch_season_roster_rules_locked('season-rules-summer', '2099-07-10 18:59:59.999+00'),
  'roster rules remain editable one millisecond before match start'
);
select ok(
  private.is_launch_season_roster_rules_locked('season-rules-summer', '2099-07-10 19:00:00+00'),
  'roster rules lock exactly at match start'
);
select ok(
  private.is_launch_season_roster_rules_locked('season-rules-summer', '2099-07-10 19:00:00.001+00'),
  'roster rules remain locked after match start'
);
select is(
  (select count(*)::integer from public.launch_schedule_matches
    where id = 'season-rules-summer-rain-delay' and status = 'Rain Delay'),
  1,
  'rain delay is an eligible canonical match status'
);
select is(
  private.launch_season_roster_rules_lock_at('season-rules-winter'),
  '2097-01-10 20:00:00+00'::timestamptz,
  'completed is an eligible canonical match status'
);

update public.launch_seasons
set mens_roster_cap = 30, womens_roster_cap = 10, junior_roster_cap = null
where id = 'season-rules-summer';
select is(
  (select mens_roster_cap from public.launch_seasons where id = 'season-rules-summer'),
  30,
  'caps can be changed before the first eligible match starts'
);

update public.launch_schedules
set published = true
where id = 'season-rules-permanent-schedule';
update public.launch_rounds
set published = true
where id = 'season-rules-permanent-round';

select is(
  (select roster_rules_locked_at from public.launch_seasons where id = 'season-rules-permanent'),
  '2020-07-10 19:00:00+00'::timestamptz,
  'database records the reached roster-rule lock'
);
select throws_ok(
  $$update public.launch_seasons set mens_roster_cap = 26 where id = 'season-rules-permanent'$$,
  '42501', 'Season roster rules are locked.',
  'cap changes are rejected after lock'
);

update public.launch_schedule_matches
set date = '2099-07-10', status = 'Cancelled'
where id = 'season-rules-permanent-match';
update public.launch_rounds
set published = false
where id = 'season-rules-permanent-round';
update public.launch_schedules
set published = false
where id = 'season-rules-permanent-schedule';

select is(
  (select roster_rules_locked_at from public.launch_seasons where id = 'season-rules-permanent'),
  '2020-07-10 19:00:00+00'::timestamptz,
  'rescheduling, cancellation, and unpublishing never clear a reached lock'
);
select ok(
  private.is_launch_season_roster_rules_locked('season-rules-permanent'),
  'persisted marker keeps the season locked when no eligible match remains'
);

set local role anon;
with changed as (
  update public.launch_seasons
  set mens_roster_cap = 31
  where id = 'season-rules-summer'
  returning id
)
select is(
  (select count(*)::integer from changed),
  0,
  'anonymous users cannot update season roster caps'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '80000000-0000-0000-0000-000000000001', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

with changed as (
  update public.launch_seasons
  set womens_roster_cap = 11
  where id = 'season-rules-summer'
  returning id
)
select is(
  (select count(*)::integer from changed),
  1,
  'approved commissioners can update roster caps before lock'
);

select throws_ok(
  $$update public.launch_seasons
    set roster_rules_locked_at = '2096-01-01T00:00:00Z'
    where id = 'season-rules-client-marker'$$,
  '42501', 'Season roster rules lock is database-managed.',
  'authenticated clients cannot set the database-managed marker'
);
select throws_ok(
  $$insert into public.launch_seasons (
      id, league_id, name, year, description, start_date, end_date,
      roster_rules_locked_at
    ) values (
      'season-rules-client-insert-marker', 'cc-team-clash',
      'Season Rules Client Insert Marker', 2095, '', '2095-01-01', '2095-12-31',
      '2095-01-01T00:00:00Z'
    )$$,
  '42501', 'Season roster rules lock is database-managed.',
  'authenticated clients cannot supply the database-managed marker on insert'
);

select is(
  (select locked from public.get_launch_season_roster_rules_states(array['season-rules-summer'])),
  false,
  'public roster-rule state reports an unlocked future season'
);
select is(
  (select locked_at from public.get_launch_season_roster_rules_states(array['season-rules-client-marker'])),
  null::timestamptz,
  'rejected marker override leaves the stored marker empty'
);

reset role;
select * from finish();
rollback;
