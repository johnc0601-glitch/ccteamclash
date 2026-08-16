begin;
set local search_path = public, extensions;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users(
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', '94000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'team-change-owner@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '94000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'team-change-other@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '94000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'team-change-approved@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '94000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'team-change-rejected@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '94000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'team-change-cancelled@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '94000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'team-change-commissioner@example.test', '', now(), now(), now(), '', '', '', '');

insert into public.launch_profiles(id, user_id, display_name, role, status) values
  ('team-change-owner-profile', '94000000-0000-0000-0000-000000000001', 'Team Change Owner', 'Player', 'Pending'),
  ('team-change-approved-profile', '94000000-0000-0000-0000-000000000003', 'Team Change Approved', 'Player', 'Pending'),
  ('team-change-rejected-profile', '94000000-0000-0000-0000-000000000004', 'Team Change Rejected', 'Player', 'Pending'),
  ('team-change-cancelled-profile', '94000000-0000-0000-0000-000000000005', 'Team Change Cancelled', 'Player', 'Pending'),
  ('team-change-commissioner-profile', '94000000-0000-0000-0000-000000000006', 'Team Change Commissioner', 'Commissioner', 'Approved');

update public.launch_seasons set active = false where active = true;
insert into public.launch_seasons(
  id, league_id, name, year, description, start_date, end_date,
  registration_open, active, published, archived
) values
  ('team-change-season', 'cc-team-clash', 'Team Change Season', 2099, '', '2099-01-01', '2099-12-31', true, true, true, false),
  ('team-change-other-season', 'cc-team-clash', 'Team Change Other Season', 2098, '', '2098-01-01', '2098-12-31', true, false, true, false);

insert into public.launch_season_teams(season_id, team_id, added_by) values
  ('team-change-season', 'beast-mode', 'team-change-owner-profile'),
  ('team-change-season', 'cougar-country', 'team-change-owner-profile'),
  ('team-change-other-season', 'dark-knights', 'team-change-owner-profile');

insert into public.launch_player_applications(
  id, profile_id, season_id, requested_team_id, player_type, gender, played_before,
  status, reviewed_at, reviewed_by
) values
  ('94000000-0000-0000-0000-000000000011', 'team-change-owner-profile', 'team-change-season', 'beast-mode', 'Adult', 'Male', false, 'Pending', null, null),
  ('94000000-0000-0000-0000-000000000012', 'team-change-approved-profile', 'team-change-season', 'beast-mode', 'Adult', 'Male', false, 'Approved', now(), 'team-change-commissioner-profile'),
  ('94000000-0000-0000-0000-000000000013', 'team-change-rejected-profile', 'team-change-season', 'beast-mode', 'Adult', 'Male', false, 'Rejected', now(), 'team-change-commissioner-profile'),
  ('94000000-0000-0000-0000-000000000014', 'team-change-cancelled-profile', 'team-change-season', 'beast-mode', 'Adult', 'Male', false, 'Cancelled', null, null);

set local role authenticated;
select set_config('request.jwt.claim.sub', '94000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$select public.change_launch_player_application_requested_team(
      '94000000-0000-0000-0000-000000000011', 'cougar-country'
    )$$,
  'Pending applicant can change requested team while registration is open'
);

reset role;
update public.launch_seasons set registration_open = false where id = 'team-change-season';
set local role authenticated;
select set_config('request.jwt.claim.sub', '94000000-0000-0000-0000-000000000001', true);

select lives_ok(
  $$select public.change_launch_player_application_requested_team(
      '94000000-0000-0000-0000-000000000011', 'beast-mode'
    )$$,
  'Pending applicant can change requested team after registration closes'
);
select is(
  (select requested_team_id from public.launch_player_applications where id = '94000000-0000-0000-0000-000000000011'),
  'beast-mode',
  'closed-registration requested-team change is stored'
);
select throws_ok(
  $$select public.change_launch_player_application_requested_team(
      '94000000-0000-0000-0000-000000000011', 'dark-knights'
    )$$,
  '23514', null, 'team enrolled only in another season is rejected'
);
select throws_ok(
  $$select public.change_launch_player_application_requested_team(
      '94000000-0000-0000-0000-000000000011', 'hayneous-og-s'
    )$$,
  '23514', null, 'unenrolled team is rejected'
);

select set_config('request.jwt.claim.sub', '94000000-0000-0000-0000-000000000002', true);
select throws_ok(
  $$select public.change_launch_player_application_requested_team(
      '94000000-0000-0000-0000-000000000011', 'cougar-country'
    )$$,
  '42501', null, 'another user cannot change the requested team'
);

select set_config('request.jwt.claim.sub', '94000000-0000-0000-0000-000000000003', true);
select throws_ok(
  $$select public.change_launch_player_application_requested_team(
      '94000000-0000-0000-0000-000000000012', 'cougar-country'
    )$$,
  '23514', null, 'Approved application cannot change requested team'
);
select set_config('request.jwt.claim.sub', '94000000-0000-0000-0000-000000000004', true);
select throws_ok(
  $$select public.change_launch_player_application_requested_team(
      '94000000-0000-0000-0000-000000000013', 'cougar-country'
    )$$,
  '23514', null, 'Rejected application cannot change requested team'
);
select set_config('request.jwt.claim.sub', '94000000-0000-0000-0000-000000000005', true);
select throws_ok(
  $$select public.change_launch_player_application_requested_team(
      '94000000-0000-0000-0000-000000000014', 'cougar-country'
    )$$,
  '23514', null, 'Cancelled application cannot change requested team'
);
select set_config('request.jwt.claim.sub', '94000000-0000-0000-0000-000000000001', true);
select is(
  (select season_id from public.launch_player_applications where id = '94000000-0000-0000-0000-000000000011'),
  'team-change-season',
  'requested-team change does not alter application season'
);
select is(
  (select count(*) from public.launch_player_claims where profile_id like 'team-change-%'),
  0::bigint,
  'requested-team change creates no claims'
);
select is(
  (select count(*) from public.launch_season_roster_memberships where season_id in ('team-change-season', 'team-change-other-season')),
  0::bigint,
  'requested-team change creates no memberships'
);
select is(
  (select count(*) from public.launch_profiles where id like 'team-change-%' and player_id is not null),
  0::bigint,
  'requested-team change does not alter profile linkage'
);
select is(
  (select count(*) from public.launch_player_applications where id = '94000000-0000-0000-0000-000000000011'),
  1::bigint,
  'requested-team change does not duplicate the application'
);

select * from finish();
rollback;
