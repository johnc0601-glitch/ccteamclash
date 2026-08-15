begin;

select plan(32);
select set_config('request.jwt.claim.sub', '83000000-0000-0000-0000-000000000001', true);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', '83000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'application-player@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '83000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'application-other@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '83000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'application-commissioner@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '83000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'application-pending-commissioner@example.test', '', now(), now(), now(), '', '', '', '');

insert into public.launch_profiles(
  id, user_id, display_name, role, status, player_id, captain_team_id
) values
  ('application-player-profile', '83000000-0000-0000-0000-000000000001', 'Application Player', 'Player', 'Pending', null, null),
  ('application-other-profile', '83000000-0000-0000-0000-000000000002', 'Other Application Player', 'Player', 'Pending', null, null),
  ('application-commissioner-profile', '83000000-0000-0000-0000-000000000003', 'Application Commissioner', 'Commissioner', 'Approved', null, null),
  ('application-pending-commissioner-profile', '83000000-0000-0000-0000-000000000004', 'Pending Commissioner', 'Commissioner', 'Pending', null, null);

update public.launch_seasons set active = false where active = true;

insert into public.launch_seasons(
  id, league_id, name, year, description, start_date, end_date,
  registration_open, active, published, archived
) values
  ('application-current-season', 'cc-team-clash', 'Application Current Season', 2099, '', '2099-01-01', '2099-12-31', true, true, true, false),
  ('application-other-season', 'cc-team-clash', 'Application Other Season', 2098, '', '2098-01-01', '2098-12-31', true, false, true, false);

insert into public.launch_season_teams(season_id, team_id, added_by) values
  ('application-current-season', 'beast-mode', 'application-commissioner-profile'),
  ('application-current-season', 'cougar-country', 'application-commissioner-profile'),
  ('application-other-season', 'beast-mode', 'application-commissioner-profile');

select has_table('public', 'launch_player_applications', 'player application table exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.launch_player_applications'::regclass),
  'player applications have RLS enabled'
);
select col_is_pk('public', 'launch_player_applications', 'id', 'player applications use stable row ids');
select col_not_null('public', 'launch_player_applications', 'requested_team_id', 'requested team is required');

select throws_ok(
  $$insert into public.launch_player_applications(
      profile_id, season_id, requested_team_id, player_type, gender, played_before
    ) values (
      'application-player-profile', 'application-current-season', 'beast-mode', 'Unknown', 'Male', false
    )$$,
  '23514', null, 'player type accepts only Adult or Junior'
);
select throws_ok(
  $$insert into public.launch_player_applications(
      profile_id, season_id, requested_team_id, player_type, gender, played_before
    ) values (
      'application-player-profile', 'application-current-season', 'beast-mode', 'Adult', 'Unknown', false
    )$$,
  '23514', null, 'application gender accepts only Male or Female'
);
select throws_ok(
  $$insert into public.launch_player_applications(
      profile_id, season_id, requested_team_id, player_type, gender, played_before, status
    ) values (
      'application-player-profile', 'application-current-season', 'beast-mode', 'Adult', 'Male', false, 'Reviewing'
    )$$,
  '23514', null, 'application status accepts only supported lifecycle values'
);
select throws_ok(
  $$insert into public.launch_player_applications(
      profile_id, season_id, requested_team_id, player_type, gender, played_before
    ) values (
      'application-player-profile', 'application-current-season', 'dark-knights', 'Adult', 'Male', false
    )$$,
  '23503', null, 'requested team must be enrolled in the same season'
);

select ok(
  not has_function_privilege('anon', 'public.submit_launch_player_application(text,text,text,text,boolean)', 'EXECUTE'),
  'anonymous users cannot submit applications'
);
select ok(
  has_function_privilege('authenticated', 'public.submit_launch_player_application(text,text,text,text,boolean)', 'EXECUTE'),
  'authenticated users can reach the narrow submit function'
);
select ok(
  not has_table_privilege('authenticated', 'public.launch_player_applications', 'INSERT'),
  'authenticated users have no direct application insert privilege'
);
select ok(
  not has_table_privilege('authenticated', 'public.launch_player_applications', 'UPDATE'),
  'authenticated users have no direct application update privilege'
);
select ok(
  not has_table_privilege('authenticated', 'public.launch_player_applications', 'DELETE'),
  'authenticated users have no direct application delete privilege'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '83000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$select public.submit_launch_player_application(
      'application-current-season', 'beast-mode', 'Adult', 'Male', false
    )$$,
  'Pending Player can submit a new-player application'
);
select is(
  (select count(*) from public.launch_player_applications),
  1::bigint,
  'applicant reads their own application'
);
select is(
  (select status from public.launch_player_applications),
  'Pending',
  'submitted application starts Pending'
);
select is(
  (select count(*) from public.launch_player_claims where profile_id = 'application-player-profile'),
  0::bigint,
  'new-player application does not create a history claim'
);
select lives_ok(
  $$select public.submit_launch_player_application(
      'application-current-season', 'beast-mode', 'Junior', 'Female', false
    )$$,
  'repeat submission idempotently updates the Pending application'
);
select is(
  (select count(*) from public.launch_player_applications),
  1::bigint,
  'repeat submission does not create a duplicate application'
);
select lives_ok(
  $$select public.change_launch_player_application_requested_team(
      (select id from public.launch_player_applications), 'cougar-country'
    )$$,
  'Pending applicant can change requested team'
);
select is(
  (select requested_team_id from public.launch_player_applications),
  'cougar-country',
  'requested-team change is stored'
);
select throws_ok(
  $$select public.submit_launch_player_application(
      'application-other-season', 'beast-mode', 'Adult', 'Male', false
    )$$,
  '23514', null, 'application submission rejects a non-current season'
);

select set_config('request.jwt.claim.sub', '83000000-0000-0000-0000-000000000002', true);
select is(
  (select count(*) from public.launch_player_applications),
  0::bigint,
  'another applicant cannot read the application'
);
select throws_ok(
  $$select public.change_launch_player_application_requested_team(
      (select id from public.launch_player_applications where profile_id = 'application-player-profile'),
      'beast-mode'
    )$$,
  '42501', null, 'another applicant cannot change requested team'
);
select throws_ok(
  $$select public.review_launch_player_application(
      (select id from public.launch_player_applications where profile_id = 'application-player-profile'),
      'Approved'
    )$$,
  '42501', null, 'a Player cannot review applications'
);

select set_config('request.jwt.claim.sub', '83000000-0000-0000-0000-000000000004', true);
select throws_ok(
  $$select public.review_launch_player_application(
      (select id from public.launch_player_applications where profile_id = 'application-player-profile'),
      'Approved'
    )$$,
  '42501', null, 'a non-Approved Commissioner cannot review applications'
);

select set_config('request.jwt.claim.sub', '83000000-0000-0000-0000-000000000003', true);
select is(
  (select count(*) from public.launch_player_applications),
  1::bigint,
  'Approved Commissioner can read pending applications'
);
select lives_ok(
  $$select public.review_launch_player_application(
      (select id from public.launch_player_applications where profile_id = 'application-player-profile'),
      'Approved'
    )$$,
  'Approved Commissioner can approve an application'
);
select ok(
  (select status = 'Approved'
      and reviewed_at is not null
      and reviewed_by = 'application-commissioner-profile'
    from public.launch_player_applications
    where profile_id = 'application-player-profile'),
  'review records trusted Commissioner audit fields'
);
select is(
  (select status from public.launch_profiles where id = 'application-player-profile'),
  'Approved',
  'atomic application review approves the profile identity'
);
select is(
  (select count(*) from public.launch_season_roster_memberships
    where season_id = 'application-current-season'
      and player_id in (
        select player_id from public.launch_profiles where id = 'application-player-profile'
      )),
  0::bigint,
  'application approval does not create season membership'
);
select throws_ok(
  $$select public.change_launch_player_application_requested_team(
      (select id from public.launch_player_applications where profile_id = 'application-player-profile'),
      'beast-mode'
    )$$,
  '42501', null, 'Commissioner cannot use the applicant-only requested-team mutation'
);

select * from finish();
rollback;
