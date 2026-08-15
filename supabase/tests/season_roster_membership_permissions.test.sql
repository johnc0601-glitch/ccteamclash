begin;

select plan(37);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', '81000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'membership-commissioner@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '81000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'membership-captain@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '81000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'membership-away-captain@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '81000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'membership-pending@example.test', '', now(), now(), now(), '', '', '', '');

insert into public.launch_profiles (
  id, user_id, display_name, role, status, player_id, captain_team_id
) values
  ('membership-commissioner-profile', '81000000-0000-0000-0000-000000000001', 'Membership Commissioner', 'Commissioner', 'Approved', null, null),
  ('membership-captain-profile', '81000000-0000-0000-0000-000000000002', 'Membership Captain', 'Captain', 'Approved', null, 'beast-mode'),
  ('membership-away-captain-profile', '81000000-0000-0000-0000-000000000003', 'Membership Away Captain', 'Captain', 'Approved', null, 'cougar-country'),
  ('membership-pending-profile', '81000000-0000-0000-0000-000000000004', 'Membership Pending Captain', 'Captain', 'Pending', null, 'beast-mode');

insert into public.launch_seasons (
  id, league_id, name, year, description, start_date, end_date,
  registration_open, active, published, archived,
  mens_roster_cap, womens_roster_cap, junior_roster_cap
) values
  ('membership-constraints', 'cc-team-clash', 'Membership Constraints', 2094, '', '2094-01-01', '2094-12-31', false, false, true, false, 25, null, null),
  ('membership-other-season', 'cc-team-clash', 'Membership Other Season', 2095, '', '2095-01-01', '2095-12-31', false, false, true, false, 25, null, null),
  ('membership-caps', 'cc-team-clash', 'Membership Caps', 2096, '', '2096-01-01', '2096-12-31', false, false, true, false, 1, 1, 1),
  ('membership-unlimited', 'cc-team-clash', 'Membership Unlimited', 2097, '', '2097-01-01', '2097-12-31', false, false, true, false, 25, null, null),
  ('membership-prelock', 'cc-team-clash', 'Membership Prelock', 2098, '', '2098-01-01', '2098-12-31', false, false, true, false, 25, null, null),
  ('membership-exact-lock', 'cc-team-clash', 'Membership Exact Lock', 2099, '', '2099-01-01', '2099-12-31', false, false, true, false, 25, null, null),
  ('membership-postlock', 'cc-team-clash', 'Membership Postlock', 2020, '', '2020-01-01', '2020-12-31', false, false, true, false, 25, null, null);

insert into public.launch_players (
  id, name, gender, pdga_number, pdga_rating, current_team_id, home_area, active
)
select
  'membership-player-' || value,
  'Membership Player ' || value,
  'Unknown', '', null, null, '', true
from generate_series(1, 30) value;

insert into public.launch_players (
  id, name, gender, pdga_number, pdga_rating, current_team_id, home_area, active
) values
  ('membership-mismatch-player', 'Membership Mismatch Player', 'Unknown', '', null, 'cougar-country', '', true),
  ('membership-inactive-player', 'Membership Inactive Player', 'Unknown', '', null, 'beast-mode', '', false);

insert into public.launch_season_teams(season_id, team_id, added_by)
select season.id, team.id, 'membership-commissioner-profile'
from public.launch_seasons season
cross join public.launch_teams team
where season.id like 'membership-%'
  and team.id in ('beast-mode', 'cougar-country');

insert into public.launch_schedules(id, season_id, name, description, published)
values
  ('membership-exact-schedule', 'membership-exact-lock', 'Exact Schedule', '', true),
  ('membership-post-schedule', 'membership-postlock', 'Post Schedule', '', true);

insert into public.launch_rounds(id, schedule_id, season_id, number, name, date, published)
values
  ('membership-exact-round', 'membership-exact-schedule', 'membership-exact-lock', 1, 'Exact Round', '2099-07-10', true),
  ('membership-post-round', 'membership-post-schedule', 'membership-postlock', 1, 'Post Round', '2020-07-10', true);

insert into public.launch_schedule_matches(
  id, round_id, season_id, home_team_id, away_team_id, course_id,
  date, time, status, notes
) values
  ('membership-exact-match', 'membership-exact-round', 'membership-exact-lock', 'beast-mode', 'cougar-country', 'castle-hayne-park', '2099-07-10', '15:00', 'Scheduled', ''),
  ('membership-post-match', 'membership-post-round', 'membership-postlock', 'beast-mode', 'cougar-country', 'castle-hayne-park', '2020-07-10', '15:00', 'Scheduled', '');

select has_table('public', 'launch_season_teams', 'season team enrollment table exists');
select has_table('public', 'launch_season_roster_memberships', 'season roster membership table exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.launch_season_teams'::regclass),
  'season team enrollment has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.launch_season_roster_memberships'::regclass),
  'season roster membership has RLS enabled'
);

select throws_ok(
  $$insert into public.launch_season_teams(season_id, team_id, added_by)
    values ('membership-prelock', 'beast-mode', 'membership-commissioner-profile')$$,
  '23505', null, 'a team can be enrolled only once per season'
);

select throws_ok(
  $$insert into public.launch_season_roster_memberships(
      season_id, team_id, player_id, roster_category, added_by
    ) values (
      'membership-constraints', 'beast-mode', 'membership-player-1', null,
      'membership-commissioner-profile'
    )$$,
  '23502', null, 'season roster category is required'
);
select throws_ok(
  $$insert into public.launch_season_roster_memberships(
      season_id, team_id, player_id, roster_category, added_by
    ) values (
      'membership-constraints', 'beast-mode', 'membership-player-1', 'Unknown',
      'membership-commissioner-profile'
    )$$,
  '23514', null, 'season roster category accepts only Men Women or Junior'
);

insert into public.launch_season_roster_memberships(
  season_id, team_id, player_id, roster_category, added_by
) values (
  'membership-constraints', 'beast-mode', 'membership-player-1', 'Men',
  'membership-commissioner-profile'
);
select throws_ok(
  $$insert into public.launch_season_roster_memberships(
      season_id, team_id, player_id, roster_category, added_by
    ) values (
      'membership-constraints', 'cougar-country', 'membership-player-1', 'Women',
      'membership-commissioner-profile'
    )$$,
  '23505', null, 'a player has only one permanent membership per season'
);
select lives_ok(
  $$insert into public.launch_season_roster_memberships(
      season_id, team_id, player_id, roster_category, added_by
    ) values (
      'membership-other-season', 'cougar-country', 'membership-player-1', 'Junior',
      'membership-commissioner-profile'
    )$$,
  'the same player can have a membership in another season'
);

insert into public.launch_season_roster_memberships(
  season_id, team_id, player_id, roster_category, added_by
) values
  ('membership-caps', 'beast-mode', 'membership-player-2', 'Men', 'membership-commissioner-profile'),
  ('membership-caps', 'beast-mode', 'membership-player-3', 'Women', 'membership-commissioner-profile'),
  ('membership-caps', 'beast-mode', 'membership-player-4', 'Junior', 'membership-commissioner-profile');

select throws_ok(
  $$insert into public.launch_season_roster_memberships(season_id, team_id, player_id, roster_category, added_by)
    values ('membership-caps', 'beast-mode', 'membership-player-5', 'Men', 'membership-commissioner-profile')$$,
  '23514', 'Season roster category cap has been reached.', 'men cap rejects the next active member'
);
select throws_ok(
  $$insert into public.launch_season_roster_memberships(season_id, team_id, player_id, roster_category, added_by)
    values ('membership-caps', 'beast-mode', 'membership-player-6', 'Women', 'membership-commissioner-profile')$$,
  '23514', 'Season roster category cap has been reached.', 'women cap is enforced independently'
);
select throws_ok(
  $$insert into public.launch_season_roster_memberships(season_id, team_id, player_id, roster_category, added_by)
    values ('membership-caps', 'beast-mode', 'membership-player-7', 'Junior', 'membership-commissioner-profile')$$,
  '23514', 'Season roster category cap has been reached.', 'junior cap is enforced independently'
);
select is(
  (select count(*)::integer from public.launch_season_roster_memberships
    where season_id = 'membership-caps' and team_id = 'beast-mode' and status = 'Active'),
  3, 'each category owns an independent active slot'
);

insert into public.launch_season_roster_memberships(
  season_id, team_id, player_id, roster_category, added_by
) values
  ('membership-unlimited', 'beast-mode', 'membership-player-8', 'Women', 'membership-commissioner-profile'),
  ('membership-unlimited', 'beast-mode', 'membership-player-9', 'Women', 'membership-commissioner-profile'),
  ('membership-unlimited', 'beast-mode', 'membership-player-10', 'Junior', 'membership-commissioner-profile'),
  ('membership-unlimited', 'beast-mode', 'membership-player-11', 'Junior', 'membership-commissioner-profile');
select is(
  (select count(*)::integer from public.launch_season_roster_memberships
    where season_id = 'membership-unlimited' and status = 'Active'),
  4, 'null women and junior caps allow unlimited active members'
);
select ok(
  pg_get_functiondef('private.enforce_launch_season_roster_membership_cap()'::regprocedure)
    ilike '%for update%',
  'cap checks serialize concurrent last-slot additions by locking the season row'
);

set local role authenticated;
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000002', true);

select lives_ok(
  $$select public.add_launch_season_roster_member(
      'membership-prelock', 'beast-mode', 'membership-player-12', 'Men'
    )$$,
  'approved captain can add to their enrolled team before lock'
);
select is(
  (select added_by from public.launch_season_roster_memberships
    where season_id = 'membership-prelock' and player_id = 'membership-player-12'),
  'membership-captain-profile', 'membership add audit actor is derived from the session'
);
select ok(
  (select added_at is not null and created_at is not null and updated_at is not null
    from public.launch_season_roster_memberships
    where season_id = 'membership-prelock' and player_id = 'membership-player-12'),
  'membership add audit timestamps are database-generated'
);
select lives_ok(
  $$select public.add_launch_season_roster_member(
      'membership-prelock', 'beast-mode', 'membership-mismatch-player', 'Junior'
    )$$,
  'current team mismatch does not override season membership'
);
select throws_ok(
  $$select public.add_launch_season_roster_member(
      'membership-prelock', 'cougar-country', 'membership-player-13', 'Men'
    )$$,
  '42501', 'Season roster membership addition is not permitted.',
  'captain cannot add to another team'
);

select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000004', true);
select throws_ok(
  $$select public.add_launch_season_roster_member(
      'membership-prelock', 'beast-mode', 'membership-player-14', 'Men'
    )$$,
  '42501', 'Season roster membership addition is not permitted.',
  'pending captain cannot add a season member'
);

reset role;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$select private.add_launch_season_roster_member_at(
      'membership-exact-lock', 'beast-mode', 'membership-player-15', 'Men',
      '2099-07-10 19:00:00+00'
    )$$,
  '42501', 'Captain additions are closed for this season.',
  'captain addition is denied exactly at the first match start'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$select public.add_launch_season_roster_member(
      'membership-postlock', 'beast-mode', 'membership-player-16', 'Men'
    )$$,
  '42501', 'Captain additions are closed for this season.',
  'captain addition is denied after season start'
);

select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$select public.add_launch_season_roster_member(
      'membership-postlock', 'beast-mode', 'membership-player-16', 'Men'
    )$$,
  'commissioner can add an active member after season start'
);
select lives_ok(
  $$select public.add_launch_season_roster_member(
      'membership-prelock', 'cougar-country', 'membership-player-17', 'Women'
    )$$,
  'commissioner can add to any enrolled team'
);

select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000002', true);
select lives_ok(
  $$select public.drop_launch_season_roster_member('membership-prelock', 'membership-player-12')$$,
  'captain can drop an active member from their assigned team'
);
select throws_ok(
  $$select public.drop_launch_season_roster_member('membership-prelock', 'membership-player-17')$$,
  '42501', 'Season roster membership drop is not permitted.',
  'captain cannot drop another team member'
);

select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000001', true);
select lives_ok(
  $$select public.drop_launch_season_roster_member('membership-prelock', 'membership-player-17')$$,
  'commissioner can drop a member from any enrolled team'
);
select is(
  (select dropped_by from public.launch_season_roster_memberships
    where season_id = 'membership-prelock' and player_id = 'membership-player-17'),
  'membership-commissioner-profile', 'drop audit actor is derived from the session'
);

reset role;
select throws_ok(
  $$update public.launch_season_roster_memberships
    set status = 'Active', dropped_by = null, dropped_at = null
    where season_id = 'membership-prelock' and player_id = 'membership-player-12'$$,
  '42501', 'Dropped season roster members cannot be reactivated.',
  'dropped membership cannot be reactivated'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000001', true);
select throws_ok(
  $$select public.add_launch_season_roster_member(
      'membership-prelock', 'beast-mode', 'membership-player-12', 'Men'
    )$$,
  '23505', 'Player already has a permanent membership for this season.',
  'dropped player cannot receive a replacement membership in the season'
);

reset role;
select throws_ok(
  $$delete from public.launch_season_roster_memberships
    where season_id = 'membership-prelock' and player_id = 'membership-player-12'$$,
  '42501', 'Season roster memberships cannot be deleted.',
  'membership rows cannot be deleted even by a privileged direct write'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '81000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$insert into public.launch_season_roster_memberships(
      season_id, team_id, player_id, roster_category, added_by, added_at
    ) values (
      'membership-prelock', 'beast-mode', 'membership-player-18', 'Men',
      'membership-commissioner-profile', '2000-01-01T00:00:00Z'
    )$$,
  '42501', null, 'authenticated clients cannot spoof membership add audit fields'
);
select throws_ok(
  $$update public.launch_season_roster_memberships
    set dropped_by = 'membership-commissioner-profile', dropped_at = now()
    where season_id = 'membership-prelock' and player_id = 'membership-mismatch-player'$$,
  '42501', null, 'authenticated clients cannot spoof membership drop audit fields'
);

reset role;
select throws_ok(
  $$update public.launch_season_roster_memberships
    set team_id = 'cougar-country'
    where season_id = 'membership-postlock' and player_id = 'membership-player-16'$$,
  '42501', 'Season roster membership team and category are locked.',
  'membership team cannot change after the season lock'
);
select throws_ok(
  $$update public.launch_season_roster_memberships
    set roster_category = 'Women'
    where season_id = 'membership-postlock' and player_id = 'membership-player-16'$$,
  '42501', 'Season roster membership team and category are locked.',
  'membership category cannot change after the season lock'
);
select ok(
  not has_table_privilege('authenticated', 'public.launch_season_roster_memberships', 'INSERT')
  and not has_table_privilege('authenticated', 'public.launch_season_roster_memberships', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.launch_season_roster_memberships', 'DELETE'),
  'direct authenticated membership writes remain revoked'
);

select * from finish();
rollback;
