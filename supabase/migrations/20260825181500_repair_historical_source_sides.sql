-- Repair the only regular-season historical matchup rows that lost side context
-- during the consolidated-sheet import. Source workbooks use Away on the left
-- and Home on the right. These values were verified against the 2025-26
-- December workbook layout; postseason venue remains neutral and is handled
-- separately by the CI replay.

update public.historical_player_matchups
set player_side = 'Away',
    home_away_validated = true
where season_id = 'coastal-clash-2025-2026'
  and deduplication_key in (
    'historical-match:14c25c8c584b6ee5ef549a7b',
    'historical-match:cb8b3bfe47b2773e511b0944'
  );

update public.historical_player_matchups
set player_side = 'Home',
    home_away_validated = true
where season_id = 'coastal-clash-2025-2026'
  and deduplication_key = 'historical-match:5f82d6a791b4bc9be32ed44e';

-- Fail the migration if a regular-season row is still missing side context.
-- Playoff/final rows are intentionally excluded because CI treats them Neutral.
do $$
begin
  if exists (
    select 1
    from public.historical_player_matchups
    where player_side is null
      and event_label !~* '(playoff|semi[- ]?final|championship|finals?)'
  ) then
    raise exception 'Historical CI side repair incomplete: unresolved regular-season rows remain';
  end if;
end $$;
