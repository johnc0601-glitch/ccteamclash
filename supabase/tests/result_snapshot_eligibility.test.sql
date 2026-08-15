begin;

select plan(8);

insert into public.launch_players(id, name, gender, pdga_number, current_team_id, active) values
  ('result-snapshot-home', 'Current Home Name', 'Unknown', '', 'dark-knights', true),
  ('result-snapshot-away', 'Current Away Name', 'Unknown', '', 'ninjas', true),
  ('result-snapshot-outsider', 'Current Outsider Name', 'Unknown', '', 'dark-knights', true);

insert into public.launch_rounds(id, schedule_id, season_id, number, name, date, published)
values (
  'result-snapshot-round', 'summer-2026-championship', 'summer-team-clash-2026',
  930, 'Result Snapshot Validation', '2026-08-01', true
);

insert into public.launch_schedule_matches(
  id, round_id, season_id, home_team_id, away_team_id, course_id, date, time, status, notes
) values (
  'result-snapshot-match', 'result-snapshot-round', 'summer-team-clash-2026',
  'dark-knights', 'ninjas', 'castle-hayne-park', '2026-08-01', '09:00', 'Completed', ''
);

insert into public.launch_match_results(match_id, home_score, away_score, status)
values ('result-snapshot-match', 1, 0, 'Draft');

insert into public.launch_result_contests(
  id, match_id, format, position, home_outcome, away_outcome, home_score, away_score
) values
  ('result-snapshot-singles-1', 'result-snapshot-match', 'Singles', 1, 'W', 'L', 7, 4),
  ('result-snapshot-singles-2', 'result-snapshot-match', 'Singles', 2, 'W', 'L', 8, 5);

select throws_ok(
  $$insert into public.launch_result_contest_players(
      contest_id, player_id, team_id, side, slot, player_name, team_name
    ) values (
      'result-snapshot-singles-1', 'result-snapshot-home', 'dark-knights', 'Home', 1, 'Spoof', 'Spoof'
    )$$,
  '23514',
  'A complete official match roster is required for player results.',
  'player results reject a missing official snapshot'
);

insert into public.launch_match_roster_snapshots(
  match_id, team_id, team_name_snapshot, needs_commissioner_review
) values ('result-snapshot-match', 'dark-knights', 'Historical Home Team', false);

select throws_ok(
  $$insert into public.launch_result_contest_players(
      contest_id, player_id, team_id, side, slot, player_name, team_name
    ) values (
      'result-snapshot-singles-1', 'result-snapshot-home', 'dark-knights', 'Home', 1, 'Spoof', 'Spoof'
    )$$,
  '23514',
  'A complete official match roster is required for player results.',
  'player results reject a partial official snapshot'
);

insert into public.launch_match_roster_snapshots(
  match_id, team_id, team_name_snapshot, needs_commissioner_review
) values ('result-snapshot-match', 'ninjas', 'Historical Away Team', false);

insert into public.launch_match_roster_snapshot_players(
  match_id, team_id, team_name_snapshot, player_id, player_name_snapshot
) values
  ('result-snapshot-match', 'dark-knights', 'Historical Home Team', 'result-snapshot-home', 'Historical Home Player'),
  ('result-snapshot-match', 'ninjas', 'Historical Away Team', 'result-snapshot-away', 'Historical Away Player');

select throws_ok(
  $$insert into public.launch_result_contest_players(
      contest_id, player_id, team_id, side, slot, player_name, team_name
    ) values (
      'result-snapshot-singles-1', 'result-snapshot-outsider', 'dark-knights', 'Home', 1, 'Spoof', 'Spoof'
    )$$,
  '23514',
  'Contest player must be listed on the official match roster.',
  'a current team assignment cannot substitute for snapshot membership'
);

select lives_ok(
  $$insert into public.launch_result_contest_players(
      contest_id, player_id, team_id, side, slot, player_name, team_name
    ) values
      ('result-snapshot-singles-1', 'result-snapshot-home', 'dark-knights', 'Home', 1, 'Spoof', 'Spoof'),
      ('result-snapshot-singles-1', 'result-snapshot-away', 'ninjas', 'Away', 1, 'Spoof', 'Spoof')$$,
  'official snapshot players can be recorded'
);

select is(
  (select player_name from public.launch_result_contest_players
   where contest_id = 'result-snapshot-singles-1' and side = 'Home'),
  'Historical Home Player',
  'the trigger stores the snapshot player name instead of client or current data'
);

select is(
  (select team_name from public.launch_result_contest_players
   where contest_id = 'result-snapshot-singles-1' and side = 'Away'),
  'Historical Away Team',
  'the trigger stores the snapshot team name instead of client or current data'
);

set local session_replication_role = replica;

update public.launch_players
set name = 'Renamed After Match', current_team_id = 'ninjas'
where id = 'result-snapshot-home';

set local session_replication_role = origin;

select lives_ok(
  $$insert into public.launch_result_contest_players(
      contest_id, player_id, team_id, side, slot, player_name, team_name
    ) values (
      'result-snapshot-singles-2', 'result-snapshot-home', 'dark-knights', 'Home', 1, 'Wrong', 'Wrong'
    )$$,
  'later player rename and transfer do not invalidate a snapshot participant'
);

select ok(
  exists (
    select 1 from public.launch_match_results
    where match_id = 'result-snapshot-match' and home_score = 1 and away_score = 0
  ),
  'team-only result scoring remains intact independently of player contests'
);

select * from finish();
rollback;
