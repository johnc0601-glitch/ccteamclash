begin;

select plan(9);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values
  ('00000000-0000-0000-0000-000000000000', '21000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'borrow-female-captain@example.test', '', now(), now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '21000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'borrow-female-commissioner@example.test', '', now(), now(), now(), '', '', '', '');

insert into public.launch_players (
  id, name, gender, pdga_number, current_team_id, active, clash_index
) values
  ('borrow-female-player', 'Borrow Female Player', 'Female', '', 'cougar-country', true, 812),
  ('borrow-male-player', 'Borrow Male Player', 'Male', '', 'cougar-country', true, 900);

insert into public.launch_profiles (
  id, user_id, display_name, role, status, player_id, captain_team_id
) values
  ('borrow-female-captain-profile', '21000000-0000-0000-0000-000000000001', 'Borrow Female Captain', 'Captain', 'Approved', null, 'dark-knights'),
  ('borrow-female-commissioner-profile', '21000000-0000-0000-0000-000000000002', 'Borrow Female Commissioner', 'Commissioner', 'Approved', null, null);

insert into public.launch_season_teams(season_id, team_id, added_by)
values
  ('summer-team-clash-2026', 'dark-knights', 'borrow-female-commissioner-profile'),
  ('summer-team-clash-2026', 'ninjas', 'borrow-female-commissioner-profile'),
  ('summer-team-clash-2026', 'cougar-country', 'borrow-female-commissioner-profile'),
  ('summer-team-clash-2026', 'kb', 'borrow-female-commissioner-profile')
on conflict (season_id, team_id) do nothing;

insert into public.launch_season_roster_memberships(
  season_id, team_id, player_id, roster_category, status, added_by
) values
  ('summer-team-clash-2026', 'cougar-country', 'borrow-female-player', 'Women', 'Active', 'borrow-female-commissioner-profile'),
  ('summer-team-clash-2026', 'cougar-country', 'borrow-male-player', 'Men', 'Active', 'borrow-female-commissioner-profile');

insert into public.launch_rounds(
  id, schedule_id, season_id, number, name, date, published
) values
  ('borrow-female-target-round', 'summer-2026-championship', 'summer-team-clash-2026', 995, 'Borrow Female Target', '2099-09-05', true),
  ('borrow-female-own-round', 'summer-2026-championship', 'summer-team-clash-2026', 996, 'Borrow Female Own Team', '2099-09-05', true);

insert into public.launch_schedule_matches(
  id, round_id, season_id, home_team_id, away_team_id, course_id, date, time, status, notes
) values
  ('borrow-female-target-match', 'borrow-female-target-round', 'summer-team-clash-2026', 'dark-knights', 'ninjas', 'castle-hayne-park', '2099-09-05', '09:00', 'Scheduled', ''),
  ('borrow-female-own-match', 'borrow-female-own-round', 'summer-team-clash-2026', 'cougar-country', 'kb', 'castle-hayne-park', '2099-09-05', '09:00', 'Scheduled', '');

set local role authenticated;
select set_config('request.jwt.claim.sub', '21000000-0000-0000-0000-000000000001', true);

select is(
  (select count(*)::integer
   from public.captain_list_borrowable_females('borrow-female-target-match', 'dark-knights')
   where player_id = 'borrow-female-player'),
  0,
  'female with a same-date team match is not borrowable while unconfirmed'
);

reset role;
insert into public.launch_match_attendance(
  match_id, team_id, player_id, status, updated_by
) values (
  'borrow-female-own-match', 'cougar-country', 'borrow-female-player', 'NotPlaying', 'borrow-female-commissioner-profile'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '21000000-0000-0000-0000-000000000001', true);

select is(
  (select count(*)::integer
   from public.captain_list_borrowable_females('borrow-female-target-match', 'dark-knights')
   where player_id = 'borrow-female-player'
     and original_team_id = 'cougar-country'
     and availability_status = 'Not playing'),
  1,
  'same-date player becomes borrowable after being marked NotPlaying for her team'
);

select is(
  (select count(*)::integer
   from public.captain_list_borrowable_females('borrow-female-target-match', 'dark-knights')
   where player_id = 'borrow-male-player'),
  0,
  'male players are never offered by the borrowed female picker'
);

select lives_ok(
  $$select public.captain_borrow_female_for_match(
      'borrow-female-target-match',
      'dark-knights',
      'borrow-female-player'
    )$$,
  'captain can borrow a confirmed-available rostered female'
);

select is(
  (select original_team_id
   from public.launch_match_roster_loans
   where match_id = 'borrow-female-target-match'
     and borrowing_team_id = 'dark-knights'
     and player_id = 'borrow-female-player'
     and removed_at is null),
  'cougar-country',
  'loan preserves the players permanent team identity'
);

select is(
  (select current_team_id from public.launch_players where id = 'borrow-female-player'),
  'cougar-country',
  'borrowing does not change launch_players.current_team_id'
);

select lives_ok(
  $$select public.captain_save_match_roster_availability_batch(
      'borrow-female-target-match',
      'dark-knights',
      '[{"player_id":"borrow-female-player","status":"Playing","singles_available":true,"doubles_available":false}]'::jsonb
    )$$,
  'borrowed player uses the normal captain attendance and round availability save'
);

select is(
  (select concat_ws(
      ':',
      attendance.team_id,
      attendance.status,
      availability.singles_available::text,
      availability.doubles_available::text
    )
   from public.launch_match_attendance attendance
   join public.launch_match_round_availability availability
     on availability.match_id = attendance.match_id
    and availability.player_id = attendance.player_id
   where attendance.match_id = 'borrow-female-target-match'
     and attendance.player_id = 'borrow-female-player'),
  'dark-knights:Playing:true:false',
  'borrowed player is stored under the borrowing team with S/D availability'
);

select lives_ok(
  $$select public.captain_remove_borrowed_female_from_match(
      'borrow-female-target-match',
      'dark-knights',
      'borrow-female-player'
    )$$,
  'captain can remove a borrowed player before lock'
);

select * from finish();
rollback;
