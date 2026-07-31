begin;

select plan(4);

set local role anon;
select lives_ok(
  $$select * from public.historical_player_matchups limit 1$$,
  'public users can read official historical matchups'
);
select throws_ok(
  $$insert into public.historical_player_matchups (
      deduplication_key, season_id, season_name, event_label, event_month, event_order,
      match_format, player_id, player_name, player_team_id, player_team_name,
      opponent_one_player_id, opponent_one_player_name, opponent_team_id, opponent_team_name,
      outcome, source_workbook, source_sheet, source_row
    ) values (
      'forbidden', 'coastal-clash-2024-2025', 'Season', 'November', 'November', 1,
      'Singles', 'alex-karp', 'Alex Karp', 'dark-knights', 'Dark Knights',
      'jesse-smelik', 'Jesse Smelik', 'wild-turkey', 'Wild Turkey',
      'W', 'book.xlsx', 'sheet', 6
    )$$,
  '42501',
  null,
  'anonymous users cannot import historical matchups'
);

set local role authenticated;
select throws_ok(
  $$insert into public.historical_player_matchups (
      deduplication_key, season_id, season_name, event_label, event_month, event_order,
      match_format, player_id, player_name, player_team_id, player_team_name,
      opponent_one_player_id, opponent_one_player_name, opponent_team_id, opponent_team_name,
      outcome, source_workbook, source_sheet, source_row
    ) values (
      'forbidden-authenticated', 'coastal-clash-2024-2025', 'Season', 'November', 'November', 1,
      'Singles', 'alex-karp', 'Alex Karp', 'dark-knights', 'Dark Knights',
      'jesse-smelik', 'Jesse Smelik', 'wild-turkey', 'Wild Turkey',
      'W', 'book.xlsx', 'sheet', 6
    )$$,
  '42501',
  null,
  'non-commissioners cannot import historical matchups'
);
select is(
  (with removed as (
    delete from public.historical_player_matchups returning deduplication_key
  ) select count(*)::integer from removed),
  0,
  'non-commissioners cannot delete historical matchups'
);

select * from finish();
rollback;
