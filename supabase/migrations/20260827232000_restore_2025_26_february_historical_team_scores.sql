-- Restore the four February 2025-26 regular-season team scores from the
-- authoritative Coastal Clash Match Play 25-26 scoreboard.
--
-- Player CI facts intentionally exclude TRIPLES / no-player penalty rows, so
-- their summed actual_points are not a safe substitute for the official team
-- scoreboard. Use natural match identity rather than generated database ids.

do $$
declare
  v_match_count integer;
begin
  select count(*) into v_match_count
  from public.historical_team_matches h
  join (values
    ('Dark Knights'::text, 'Ninjas'::text, 18::numeric, 20::numeric),
    ('KB'::text, 'Hayneous OG''s'::text, 15.5::numeric, 20.5::numeric),
    ('Cougar Country'::text, 'Beast Mode'::text, 12::numeric, 24::numeric),
    ('Riptide'::text, 'Wild Turkey'::text, 18::numeric, 18::numeric)
  ) expected(away_team_name, home_team_name, away_score, home_score)
    on h.season_name = '2025-2026'
   and h.event_order = 5
   and h.event_label = 'February'
   and h.away_team_name = expected.away_team_name
   and h.home_team_name = expected.home_team_name;

  if v_match_count <> 4 then
    raise exception 'Expected exactly four February 2025-26 historical matches, found %.', v_match_count;
  end if;

  if exists (
    select 1
    from public.historical_team_matches h
    join (values
      ('Dark Knights'::text, 'Ninjas'::text, 18::numeric, 20::numeric),
      ('KB'::text, 'Hayneous OG''s'::text, 15.5::numeric, 20.5::numeric),
      ('Cougar Country'::text, 'Beast Mode'::text, 12::numeric, 24::numeric),
      ('Riptide'::text, 'Wild Turkey'::text, 18::numeric, 18::numeric)
    ) expected(away_team_name, home_team_name, away_score, home_score)
      on h.season_name = '2025-2026'
     and h.event_order = 5
     and h.event_label = 'February'
     and h.away_team_name = expected.away_team_name
     and h.home_team_name = expected.home_team_name
    where (h.away_score is not null and h.away_score <> expected.away_score)
       or (h.home_score is not null and h.home_score <> expected.home_score)
  ) then
    raise exception 'A February 2025-26 historical score conflicts with the authoritative scoreboard.';
  end if;

  update public.historical_team_matches h
  set away_score = expected.away_score,
      home_score = expected.home_score
  from (values
    ('Dark Knights'::text, 'Ninjas'::text, 18::numeric, 20::numeric),
    ('KB'::text, 'Hayneous OG''s'::text, 15.5::numeric, 20.5::numeric),
    ('Cougar Country'::text, 'Beast Mode'::text, 12::numeric, 24::numeric),
    ('Riptide'::text, 'Wild Turkey'::text, 18::numeric, 18::numeric)
  ) expected(away_team_name, home_team_name, away_score, home_score)
  where h.season_name = '2025-2026'
    and h.event_order = 5
    and h.event_label = 'February'
    and h.away_team_name = expected.away_team_name
    and h.home_team_name = expected.home_team_name;
end
$$;
