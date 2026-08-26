-- Historical contest rows still contain two inactive duplicate player IDs in
-- partner/opponent references. Canonicalize them before CI replay so mirrored
-- contests group as one contest and rating movement remains zero-sum.
--
-- Previously approved identities:
--   Travis Bochum -> Travis Baucom (PDGA 103594)
--   Ilya Batazhan -> Eli Batazhan (PDGA 225786)

update public.historical_player_matchups
set partner_player_id = case partner_player_id
      when 'travis-bochum' then 'travis-baucom'
      when 'ilya-batazhan' then 'eli-batazhan'
      else partner_player_id end,
    partner_player_name = case
      when partner_player_id = 'travis-bochum' or lower(partner_player_name) = 'travis bochum' then 'Travis Baucom'
      when partner_player_id = 'ilya-batazhan' or lower(partner_player_name) = 'ilya batazhan' then 'Eli Batazhan'
      else partner_player_name end,
    opponent_one_player_id = case opponent_one_player_id
      when 'travis-bochum' then 'travis-baucom'
      when 'ilya-batazhan' then 'eli-batazhan'
      else opponent_one_player_id end,
    opponent_one_player_name = case
      when opponent_one_player_id = 'travis-bochum' or lower(opponent_one_player_name) = 'travis bochum' then 'Travis Baucom'
      when opponent_one_player_id = 'ilya-batazhan' or lower(opponent_one_player_name) = 'ilya batazhan' then 'Eli Batazhan'
      else opponent_one_player_name end,
    opponent_two_player_id = case opponent_two_player_id
      when 'travis-bochum' then 'travis-baucom'
      when 'ilya-batazhan' then 'eli-batazhan'
      else opponent_two_player_id end,
    opponent_two_player_name = case
      when opponent_two_player_id = 'travis-bochum' or lower(opponent_two_player_name) = 'travis bochum' then 'Travis Baucom'
      when opponent_two_player_id = 'ilya-batazhan' or lower(opponent_two_player_name) = 'ilya batazhan' then 'Eli Batazhan'
      else opponent_two_player_name end,
    player_name = case
      when lower(player_name) = 'travis bochum' then 'Travis Baucom'
      when lower(player_name) = 'ilya batazhan' then 'Eli Batazhan'
      else player_name end
where partner_player_id in ('travis-bochum','ilya-batazhan')
   or opponent_one_player_id in ('travis-bochum','ilya-batazhan')
   or opponent_two_player_id in ('travis-bochum','ilya-batazhan')
   or lower(player_name) in ('travis bochum','ilya batazhan');

-- The player_id column already uses the active canonical IDs. Assert that no
-- inactive aliases remain anywhere in historical contest participant fields.
do $$
begin
  if exists (
    select 1 from public.historical_player_matchups
    where player_id in ('travis-bochum','ilya-batazhan')
       or partner_player_id in ('travis-bochum','ilya-batazhan')
       or opponent_one_player_id in ('travis-bochum','ilya-batazhan')
       or opponent_two_player_id in ('travis-bochum','ilya-batazhan')
  ) then
    raise exception 'Historical player alias canonicalization incomplete';
  end if;
end $$;
