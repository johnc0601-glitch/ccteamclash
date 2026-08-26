-- Confirmed historical identity repair:
-- Kurtis Brandenburg -> Kurty McGurty (PDGA 17915).
-- Keep Kurt Ferguson (PDGA 146519) as a separate player.
-- Preserve historical outcomes, teams, and opponent facts; only canonicalize
-- participant identity references so CI carries across seasons correctly.

update public.historical_player_matchups
set player_id = 'kurty-mcgurty',
    player_name = 'Kurty McGurty'
where player_id = 'kurtis-brandenburg';

update public.historical_player_matchups
set partner_player_id = 'kurty-mcgurty',
    partner_player_name = 'Kurty McGurty'
where partner_player_id = 'kurtis-brandenburg';

update public.historical_player_matchups
set opponent_one_player_id = 'kurty-mcgurty',
    opponent_one_player_name = 'Kurty McGurty'
where opponent_one_player_id = 'kurtis-brandenburg';

update public.historical_player_matchups
set opponent_two_player_id = 'kurty-mcgurty',
    opponent_two_player_name = 'Kurty McGurty'
where opponent_two_player_id = 'kurtis-brandenburg';

do $$
begin
  if exists (
    select 1
    from public.historical_player_matchups
    where player_id = 'kurtis-brandenburg'
       or partner_player_id = 'kurtis-brandenburg'
       or opponent_one_player_id = 'kurtis-brandenburg'
       or opponent_two_player_id = 'kurtis-brandenburg'
  ) then
    raise exception 'Kurtis Brandenburg -> Kurty McGurty canonicalization incomplete';
  end if;
end $$;
