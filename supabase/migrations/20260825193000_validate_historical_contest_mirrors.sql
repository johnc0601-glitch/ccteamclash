-- Historical CI replay assumes one player-perspective row per participant.
-- Enforce that invariant after alias/team/source repairs: singles must have two
-- perspectives and doubles must have four. If a future historical import breaks
-- that shape, the CI migration fails rather than creating non-zero-sum ratings.

do $$
begin
  if exists (
    with keyed as (
      select
        season_id,
        event_order,
        match_format,
        concat_ws(
          '|',
          season_id,
          event_order,
          least(player_team_id, opponent_team_id),
          greatest(player_team_id, opponent_team_id),
          match_format,
          (
            select string_agg(participant_id, ',' order by participant_id)
            from unnest(array_remove(array[
              player_id,
              partner_player_id,
              opponent_one_player_id,
              opponent_two_player_id
            ], null)) participant_id
          )
        ) as contest_key
      from public.historical_player_matchups
    ),
    grouped as (
      select match_format, contest_key, count(*) as perspectives
      from keyed
      group by match_format, contest_key
    )
    select 1
    from grouped
    where (match_format = 'Singles' and perspectives <> 2)
       or (match_format = 'Doubles' and perspectives <> 4)
  ) then
    raise exception 'Historical CI source contains incomplete or duplicated contest perspectives';
  end if;
end $$;
