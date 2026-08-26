-- Restore four player-perspective rows omitted by the 2025-26 consolidated
-- matchup import. The authoritative monthly sheets contain all four players.
-- CI needs every participant perspective so historical rating movement remains
-- zero-sum and every player's match history receives the same contest fact.

insert into public.historical_player_matchups (
  deduplication_key, season_id, season_name, event_label, event_month, event_order,
  match_format, player_id, player_name, player_team_id, player_team_name,
  partner_player_id, partner_player_name, opponent_one_player_id, opponent_one_player_name,
  opponent_two_player_id, opponent_two_player_name, opponent_team_id, opponent_team_name,
  outcome, raw_result, raw_score, source_workbook, source_sheet, source_row,
  historical_team_match_id, player_side, home_away_validated
) values
  (
    'historical-repair:2025-2026:november:cc-ninjas:doubles:logan-canale',
    'coastal-clash-2025-2026','2025-2026','November','November',2,
    'Doubles','logan-canale','Logan Canale','cougar-country','Cougar Country',
    'brianna-kinsman','Brianna Kinsman','nadya-gutierrez','Nadya Gutierrez',
    'nicole-pierre','Nicole Pierre','ninjas','Ninjas',
    'L','L',null,'Coastal Clash Match Play ''25_''26.xlsx','November',34,
    23,'Away',true
  ),
  (
    'historical-repair:2025-2026:november:cc-ninjas:doubles:brianna-kinsman',
    'coastal-clash-2025-2026','2025-2026','November','November',2,
    'Doubles','brianna-kinsman','Brianna Kinsman','cougar-country','Cougar Country',
    'logan-canale','Logan Canale','nadya-gutierrez','Nadya Gutierrez',
    'nicole-pierre','Nicole Pierre','ninjas','Ninjas',
    'L','L',null,'Coastal Clash Match Play ''25_''26.xlsx','November',34,
    23,'Away',true
  ),
  (
    'historical-repair:2025-2026:december:kb-ninjas:doubles:nadya-gutierrez',
    'coastal-clash-2025-2026','2025-2026','December','December',3,
    'Doubles','nadya-gutierrez','Nadya Gutierrez','ninjas','Ninjas',
    'nicole-pierre','Nicole Pierre','crystal-fussell','Crystal Fussell',
    'ariel-cosimo','Ariel Cosimo','kb','KB',
    'W','W',null,'Coastal Clash Match Play ''25_''26.xlsx','December',34,
    29,'Home',true
  ),
  (
    'historical-repair:2025-2026:december:kb-ninjas:doubles:nicole-pierre',
    'coastal-clash-2025-2026','2025-2026','December','December',3,
    'Doubles','nicole-pierre','Nicole Pierre','ninjas','Ninjas',
    'nadya-gutierrez','Nadya Gutierrez','crystal-fussell','Crystal Fussell',
    'ariel-cosimo','Ariel Cosimo','kb','KB',
    'W','W',null,'Coastal Clash Match Play ''25_''26.xlsx','December',34,
    29,'Home',true
  )
on conflict (deduplication_key) do nothing;
