-- Restore four player-perspective rows missing from the 2025-26 consolidated
-- historical import. The outcomes and pairings are directly visible in the
-- source workbook; these are not inferred CI results.
--
-- November: Cougar Country (Away) Logan Canale + Brianna Kinsman lost to
-- Ninjas (Home) Nadya Gutierrez + Nicole Pierre.
-- December: the recorded Away pair Crystal Fussell + Ariel Cosimo lost to
-- Ninjas (Home) Nadya Gutierrez + Nicole Pierre. Preserve Ariel's historical
-- team record separately; these rows only restore the missing Ninjas-side
-- player perspectives for the round.

insert into public.historical_player_matchups (
  deduplication_key, season_id, season_name, event_label, event_month, event_order,
  match_format, player_id, player_name, player_team_id, player_team_name,
  partner_player_id, partner_player_name, opponent_one_player_id, opponent_one_player_name,
  opponent_two_player_id, opponent_two_player_name, opponent_team_id, opponent_team_name,
  outcome, raw_result, raw_score, source_workbook, source_sheet, source_row,
  historical_team_match_id, player_side, home_away_validated
) values
(
  'historical-repair:2025-26:nov:logan-canale-doubles-ninjas',
  'coastal-clash-2025-2026','2025-2026','November','November',2,
  'Doubles','logan-canale','Logan Canale','cougar-country','Cougar Country',
  'brianna-kinsman','Brianna Kinsman','nadya-gutierrez','Nadya Gutierrez',
  'nicole-pierre','Nicole Pierre','ninjas','Ninjas',
  'L','L',null,'Coastal Clash Match Play ''25_''26.xlsx','November',34,
  23,'Away',true
),
(
  'historical-repair:2025-26:nov:brianna-kinsman-doubles-ninjas',
  'coastal-clash-2025-2026','2025-2026','November','November',2,
  'Doubles','brianna-kinsman','Brianna Kinsman','cougar-country','Cougar Country',
  'logan-canale','Logan Canale','nadya-gutierrez','Nadya Gutierrez',
  'nicole-pierre','Nicole Pierre','ninjas','Ninjas',
  'L','L',null,'Coastal Clash Match Play ''25_''26.xlsx','November',34,
  23,'Away',true
),
(
  'historical-repair:2025-26:dec:nadya-gutierrez-doubles-away-pair',
  'coastal-clash-2025-2026','2025-2026','December','December',3,
  'Doubles','nadya-gutierrez','Nadya Gutierrez','ninjas','Ninjas',
  'nicole-pierre','Nicole Pierre','crystal-fussell','Crystal Fussell',
  'ariel-cosimo','Ariel Cosimo','kb','KB',
  'W','W',null,'Coastal Clash Match Play ''25_''26.xlsx','December',34,
  29,'Home',true
),
(
  'historical-repair:2025-26:dec:nicole-pierre-doubles-away-pair',
  'coastal-clash-2025-2026','2025-2026','December','December',3,
  'Doubles','nicole-pierre','Nicole Pierre','ninjas','Ninjas',
  'nadya-gutierrez','Nadya Gutierrez','crystal-fussell','Crystal Fussell',
  'ariel-cosimo','Ariel Cosimo','kb','KB',
  'W','W',null,'Coastal Clash Match Play ''25_''26.xlsx','December',34,
  29,'Home',true
)
on conflict (deduplication_key) do nothing;
