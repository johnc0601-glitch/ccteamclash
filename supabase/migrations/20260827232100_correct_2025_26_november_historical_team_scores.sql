-- The 2025-26 schedule summary retained two stale November score totals.
-- The detailed match scoreboards and the season points table agree on the
-- corrected values below, so use those authoritative totals for calibration.
-- Natural match identity is used instead of generated database ids.

do $$
declare
  v_match_count integer;
begin
  select count(*) into v_match_count
  from public.historical_team_matches h
  join (values
    ('KB'::text, 'Wild Turkey'::text, 27::numeric, 9::numeric),
    ('Beast Mode'::text, 'Hayneous OG''s'::text, 21.5::numeric, 15.5::numeric)
  ) expected(away_team_name, home_team_name, away_score, home_score)
    on h.season_name = '2025-2026'
   and h.event_order = 2
   and h.event_label = 'November'
   and h.away_team_name = expected.away_team_name
   and h.home_team_name = expected.home_team_name;

  if v_match_count <> 2 then
    raise exception 'Expected exactly two November 2025-26 historical score corrections, found %.', v_match_count;
  end if;

  update public.historical_team_matches h
  set away_score = expected.away_score,
      home_score = expected.home_score
  from (values
    ('KB'::text, 'Wild Turkey'::text, 27::numeric, 9::numeric),
    ('Beast Mode'::text, 'Hayneous OG''s'::text, 21.5::numeric, 15.5::numeric)
  ) expected(away_team_name, home_team_name, away_score, home_score)
  where h.season_name = '2025-2026'
    and h.event_order = 2
    and h.event_label = 'November'
    and h.away_team_name = expected.away_team_name
    and h.home_team_name = expected.home_team_name;
end
$$;
