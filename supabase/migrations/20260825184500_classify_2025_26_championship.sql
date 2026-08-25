-- The 2025-26 March workbook contains the Beast Mode vs KB semifinal and the
-- later Riptide vs Beast Mode championship on the same sheet. The consolidated
-- import labeled both team pairs "March Semifinals" with event_order 6.
--
-- Both are neutral for CI, but chronology matters: the championship must replay
-- after the semifinal so Beast Mode enters the final with its post-semifinal CI.

update public.historical_player_matchups
set event_label = 'March Championship',
    event_order = 7
where season_name = '2025-2026'
  and event_label = 'March Semifinals'
  and (
    (player_team_name = 'Beast Mode' and opponent_team_name = 'Riptide')
    or (player_team_name = 'Riptide' and opponent_team_name = 'Beast Mode')
  );

-- The source contains 36 player-result rows for this championship. Fail closed
-- if the archive does not resolve to that complete matchup after correction.
do $$
declare
  championship_rows integer;
begin
  select count(*) into championship_rows
  from public.historical_player_matchups
  where season_name = '2025-2026'
    and event_label = 'March Championship'
    and (
      (player_team_name = 'Beast Mode' and opponent_team_name = 'Riptide')
      or (player_team_name = 'Riptide' and opponent_team_name = 'Beast Mode')
    );

  if championship_rows <> 36 then
    raise exception 'Expected 36 2025-26 championship player rows, found %', championship_rows;
  end if;
end $$;
