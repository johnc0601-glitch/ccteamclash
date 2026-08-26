-- Canonicalize the confirmed historical identity Stephen Ajov as the active
-- Stev Absher player record (PDGA 103684). Historical results and team facts
-- stay unchanged; only player references/names are unified for CI replay.

update public.historical_player_matchups
set player_id = 'stev-absher',
    player_name = 'Stev Absher'
where player_id = 'stephen-ajov';

update public.historical_player_matchups
set partner_player_id = 'stev-absher',
    partner_player_name = 'Stev Absher'
where partner_player_id = 'stephen-ajov';

update public.historical_player_matchups
set opponent_one_player_id = 'stev-absher',
    opponent_one_player_name = 'Stev Absher'
where opponent_one_player_id = 'stephen-ajov';

update public.historical_player_matchups
set opponent_two_player_id = 'stev-absher',
    opponent_two_player_name = 'Stev Absher'
where opponent_two_player_id = 'stephen-ajov';

do $$
begin
  if exists (
    select 1
    from public.historical_player_matchups
    where player_id = 'stephen-ajov'
       or partner_player_id = 'stephen-ajov'
       or opponent_one_player_id = 'stephen-ajov'
       or opponent_two_player_id = 'stephen-ajov'
  ) then
    raise exception 'Stephen Ajov historical identity canonicalization incomplete';
  end if;
end $$;
