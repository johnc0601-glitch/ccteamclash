begin;
create extension if not exists pgtap with schema extensions;
select plan(23);

insert into auth.users(
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', '91000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'atomic-commissioner@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '91000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'atomic-new@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '91000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'atomic-returning@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '91000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'atomic-rejected@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '91000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'atomic-failure@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '91000000-0000-0000-0000-000000000006', 'authenticated', 'authenticated', 'atomic-player@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '91000000-0000-0000-0000-000000000007', 'authenticated', 'authenticated', 'atomic-late-failure@example.test', '', now(), now(), now(), '', '', '', '');

insert into public.launch_profiles(id, user_id, display_name, role, status) values
  ('atomic-review-commissioner', '91000000-0000-0000-0000-000000000001', 'QA Commissioner', 'Commissioner', 'Approved'),
  ('atomic-review-new', '91000000-0000-0000-0000-000000000002', 'QA New Player', 'Player', 'Pending'),
  ('atomic-review-returning', '91000000-0000-0000-0000-000000000003', 'QA Returning Player', 'Player', 'Pending'),
  ('atomic-review-rejected', '91000000-0000-0000-0000-000000000004', 'QA Rejected Player', 'Player', 'Pending'),
  ('atomic-review-failure', '91000000-0000-0000-0000-000000000005', 'QA Failure Player', 'Player', 'Pending'),
  ('atomic-review-normal-player', '91000000-0000-0000-0000-000000000006', 'QA Normal Player', 'Player', 'Approved'),
  ('atomic-review-late-failure', '91000000-0000-0000-0000-000000000007', 'QA Late Failure', 'Player', 'Pending');

insert into public.launch_players(id, name, gender, active)
values ('atomic-existing-player', 'QA Historical Player', 'Male', true);

update public.launch_seasons set active = false where active = true;
insert into public.launch_seasons(
  id, league_id, name, year, description, start_date, end_date,
  registration_open, active, published, archived
) values (
  'atomic-review-season', 'cc-team-clash', 'Atomic Review Season', 2099, '',
  '2099-01-01', '2099-12-31', true, true, true, false
);
insert into public.launch_season_teams(season_id, team_id, added_by) values
  ('atomic-review-season', 'beast-mode', 'atomic-review-commissioner'),
  ('atomic-review-season', 'cougar-country', 'atomic-review-commissioner');

insert into public.launch_player_claims(
  id, profile_id, requested_player_id, submitted_name, submitted_pdga_number, status
) values
  ('atomic-returning-claim', 'atomic-review-returning', 'atomic-existing-player', 'QA Returning Player', '', 'Pending'),
  ('atomic-rejected-claim', 'atomic-review-rejected', 'atomic-existing-player', 'QA Rejected Player', '', 'Pending');

insert into public.launch_player_applications(
  id, profile_id, season_id, requested_team_id, player_type, gender, played_before, status
) values
  ('91000000-0000-0000-0000-000000000101', 'atomic-review-new', 'atomic-review-season', 'beast-mode', 'Adult', 'Female', false, 'Pending'),
  ('91000000-0000-0000-0000-000000000102', 'atomic-review-returning', 'atomic-review-season', 'beast-mode', 'Adult', 'Male', true, 'Pending'),
  ('91000000-0000-0000-0000-000000000103', 'atomic-review-rejected', 'atomic-review-season', 'cougar-country', 'Junior', 'Female', true, 'Pending'),
  ('91000000-0000-0000-0000-000000000104', 'atomic-review-failure', 'atomic-review-season', 'cougar-country', 'Adult', 'Male', true, 'Pending'),
  ('91000000-0000-0000-0000-000000000105', 'atomic-review-late-failure', 'atomic-review-season', 'beast-mode', 'Adult', 'Female', false, 'Pending');

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000001', true);

select extensions.lives_ok(
  $$select public.review_launch_player_application('91000000-0000-0000-0000-000000000101', 'Approved')$$,
  'new-player approval succeeds atomically'
);
select extensions.is((select status from public.launch_player_applications where id = '91000000-0000-0000-0000-000000000101'), 'Approved', 'new application is Approved');
select extensions.is((select status from public.launch_profiles where id = 'atomic-review-new'), 'Approved', 'new profile is Approved');
select extensions.is((select player_id from public.launch_profiles where id = 'atomic-review-new'), 'player-application-91000000-0000-0000-0000-000000000101', 'new profile links deterministic player identity');
select extensions.is((select count(*)::integer from public.launch_players where id = 'player-application-91000000-0000-0000-0000-000000000101'), 1, 'new approval creates exactly one directory player');

select extensions.lives_ok(
  $$select public.review_launch_player_application('91000000-0000-0000-0000-000000000102', 'Approved')$$,
  'returning-player approval succeeds atomically'
);
select extensions.is((select player_id from public.launch_profiles where id = 'atomic-review-returning'), 'atomic-existing-player', 'returning profile links claimed player');
select extensions.is((select status from public.launch_player_claims where id = 'atomic-returning-claim'), 'Approved', 'returning claim is Approved');
select extensions.ok((select reviewed_by = 'atomic-review-commissioner' and reviewed_at is not null from public.launch_player_claims where id = 'atomic-returning-claim'), 'claim review audit is internally derived');

select extensions.lives_ok(
  $$select public.review_launch_player_application('91000000-0000-0000-0000-000000000103', 'Rejected')$$,
  'rejection succeeds atomically'
);
select extensions.is((select status from public.launch_profiles where id = 'atomic-review-rejected'), 'Rejected', 'rejection updates profile');
select extensions.is((select status from public.launch_player_claims where id = 'atomic-rejected-claim'), 'Rejected', 'rejection updates pending claim');

select extensions.throws_ok(
  $$select public.review_launch_player_application('91000000-0000-0000-0000-000000000104', 'Approved')$$,
  'P0002', 'A Pending returning-player claim with a selected player is required.',
  'failed returning approval is rejected'
);
select extensions.is((select status from public.launch_player_applications where id = '91000000-0000-0000-0000-000000000104'), 'Pending', 'failed approval leaves application Pending');
select extensions.is((select status from public.launch_profiles where id = 'atomic-review-failure'), 'Pending', 'failed approval leaves profile Pending');

reset role;
create function public.atomic_review_test_force_failure()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.id = '91000000-0000-0000-0000-000000000105'::uuid and new.status = 'Approved' then
    raise exception 'forced late review failure';
  end if;
  return new;
end;
$$;
create trigger atomic_review_test_force_failure
before update on public.launch_player_applications
for each row execute function public.atomic_review_test_force_failure();
set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000001', true);
select extensions.throws_ok(
  $$select public.review_launch_player_application('91000000-0000-0000-0000-000000000105', 'Approved')$$,
  'P0001', 'forced late review failure',
  'failure after identity work rolls back the entire review'
);
select extensions.is((select status from public.launch_profiles where id = 'atomic-review-late-failure'), 'Pending', 'late failure rolls profile approval back');
select extensions.is((select count(*)::integer from public.launch_players where id = 'player-application-91000000-0000-0000-0000-000000000105'), 0, 'late failure rolls directory-player creation back');

select extensions.throws_ok(
  $$select public.review_launch_player_application('91000000-0000-0000-0000-000000000101', 'Approved')$$,
  'P0002', 'Pending player application not found.',
  'reviewed application cannot be reviewed twice'
);
select extensions.is((select count(*)::integer from public.launch_players where id = 'player-application-91000000-0000-0000-0000-000000000101'), 1, 'retry creates no duplicate directory player');
select extensions.is((select count(*)::integer from public.launch_season_roster_memberships where player_id like 'player-application-%'), 0, 'application review creates no season membership');
select extensions.ok((select reviewed_by = 'atomic-review-commissioner' and reviewed_at is not null from public.launch_player_applications where id = '91000000-0000-0000-0000-000000000101'), 'review audit is internally derived');

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000006', true);
select extensions.throws_ok(
  $$select public.review_launch_player_application('91000000-0000-0000-0000-000000000104', 'Rejected')$$,
  '42501', 'Approved Commissioner access is required.',
  'non-Commissioner review is denied'
);

select * from extensions.finish();
rollback;
