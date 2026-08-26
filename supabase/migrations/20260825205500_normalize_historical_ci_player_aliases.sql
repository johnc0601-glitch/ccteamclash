-- Canonicalize only previously confirmed duplicate player identities used by
-- historical CI references. Do not alter team history, results, or roster facts.
--
-- PDGA 103594: Travis Bochum -> Travis Baucom
-- PDGA 225786: Ilya Batazhan -> Eli Batazhan
--
-- These aliases split mirrored contests into separate synthetic contests even
-- though they represent the same person. Normalize every player reference so
-- CI replay sees one canonical participant identity.

update public.historical_player_matchups
set player_id = 'travis-baucom',
    player_name = 'Travis Baucom'
where player_id = 'travis-bochum';

update public.historical_player_matchups
set partner_player_id = 'travis-baucom',
    partner_player_name = 'Travis Baucom'
where partner_player_id = 'travis-bochum';

update public.historical_player_matchups
set opponent_one_player_id = 'travis-baucom',
    opponent_one_player_name = 'Travis Baucom'
where opponent_one_player_id = 'travis-bochum';

update public.historical_player_matchups
set opponent_two_player_id = 'travis-baucom',
    opponent_two_player_name = 'Travis Baucom'
where opponent_two_player_id = 'travis-bochum';

update public.historical_player_matchups
set player_id = 'eli-batazhan',
    player_name = 'Eli Batazhan'
where player_id = 'ilya-batazhan';

update public.historical_player_matchups
set partner_player_id = 'eli-batazhan',
    partner_player_name = 'Eli Batazhan'
where partner_player_id = 'ilya-batazhan';

update public.historical_player_matchups
set opponent_one_player_id = 'eli-batazhan',
    opponent_one_player_name = 'Eli Batazhan'
where opponent_one_player_id = 'ilya-batazhan';

update public.historical_player_matchups
set opponent_two_player_id = 'eli-batazhan',
    opponent_two_player_name = 'Eli Batazhan'
where opponent_two_player_id = 'ilya-batazhan';

-- Fail closed if either retired alias remains in any participant position.
do $$
begin
  if exists (
    select 1
    from public.historical_player_matchups
    where player_id in ('travis-bochum', 'ilya-batazhan')
       or partner_player_id in ('travis-bochum', 'ilya-batazhan')
       or opponent_one_player_id in ('travis-bochum', 'ilya-batazhan')
       or opponent_two_player_id in ('travis-bochum', 'ilya-batazhan')
  ) then
    raise exception 'Historical CI alias normalization incomplete';
  end if;
end $$;
