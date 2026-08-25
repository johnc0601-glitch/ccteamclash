-- Repair the only three 2025-26 regular-season historical matchup rows that
-- lost their side during the Combined Matchup Results import.
--
-- Source authority: Coastal Clash Match Play '25_'26.xlsx, December sheet.
-- The workbook uses a stable layout where the left player/team block is Away
-- and the right player/team block is Home. These rows are therefore not
-- inferred from current team profiles or the archived schedule.
--
-- Ariel Cosimo appears in the left/Away block against Nadya Gutierrez.
-- Nadya Gutierrez appears in the right/Home block against Ariel Cosimo.

update public.historical_player_matchups
set player_side = 'Away',
    home_away_validated = true
where deduplication_key in (
  'historical-match:14c25c8c584b6ee5ef549a7b',
  'historical-match:cb8b3bfe47b2773e511b0944'
)
  and season_name = '2025-2026'
  and event_label = 'December';

update public.historical_player_matchups
set player_side = 'Home',
    home_away_validated = true
where deduplication_key = 'historical-match:5f82d6a791b4bc9be32ed44e'
  and season_name = '2025-2026'
  and event_label = 'December';

-- Fail closed if any regular-season historical row still lacks a side. Known
-- postseason rows are intentionally excluded because CI classifies them Neutral.
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
