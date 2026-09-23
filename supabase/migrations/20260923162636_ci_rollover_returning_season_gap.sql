create or replace function private.apply_clash_season_rollover(target_season_id text, target_player_id text, preview_only boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  target public.launch_seasons%rowtype;
  prior public.launch_seasons%rowtype;
  p record;
  prior_ci integer;
  last_match date;
  date_basis text;
  historical record;
  month_number integer;
  match_year integer;
  start_ci integer;
  rule_name text;
  effective_on date;
  result jsonb := '[]'::jsonb;
  engine_setting text := coalesce(current_setting('app.clash_rating_engine_write', true), 'off');
begin
  if not ((auth.uid() is not null and private.is_launch_commissioner())
          or (session_user = 'postgres' and coalesce(current_setting('role', true), 'none') in ('none','postgres'))
          or auth.role() = 'service_role') then
    raise exception 'Approved commissioner access is required.' using errcode = '42501';
  end if;
  if preview_only is null then raise exception 'Preview mode must be specified.'; end if;
  -- Serialize against other rollovers and rating publication (which writes players).
  select * into target from public.launch_seasons where id = target_season_id for update;
  if not found or target.start_date is null or target.archived or not target.active then
    raise exception 'Select the active, non-archived season with a start date.';
  end if;
  if (now() at time zone 'America/New_York')::date >= target.start_date then
    raise exception 'Starting CI cannot be reset after the season has started.';
  end if;
  select * into prior from public.launch_seasons
    where league_id = target.league_id and start_date < target.start_date
    order by start_date desc limit 1;
  if prior.id is not null and (prior.end_date is null or prior.end_date >= (now() at time zone 'America/New_York')::date) then
    raise exception 'The prior season must have ended before rollover.';
  end if;

  for p in
    select player.* from public.launch_players player
    where (target_player_id is null or player.id = target_player_id)
      and exists (select 1 from public.launch_season_roster_memberships roster
        where roster.player_id = player.id and roster.season_id = target.id and roster.status = 'Active')
    order by player.id for update of player
  loop
    -- A returning player may have skipped a season. Use the last season in
    -- which this player has a rating or match, never classify them as new.
    select s.* into prior from public.launch_seasons s
      where s.league_id = target.league_id and s.start_date < target.start_date
        and (exists (select 1 from public.clash_rating_season_snapshots snap where snap.season_id=s.id and snap.player_id=p.id)
          or exists (select 1 from public.historical_player_matchups h where h.season_id=s.id and h.player_id=p.id)
          or exists (select 1 from public.clash_contest_rating_facts f join public.launch_schedule_matches m on m.id=f.match_id where m.season_id=s.id and f.player_id=p.id))
      order by s.start_date desc limit 1;
    if exists (select 1 from public.clash_match_rating_snapshots snap
      join public.launch_schedule_matches m on m.id = snap.match_id
      where snap.player_id = p.id and m.season_id = target.id)
      or exists (select 1 from public.clash_contest_rating_facts f
      join public.launch_schedule_matches m on m.id = f.match_id
      where f.player_id = p.id and m.season_id = target.id) then
      raise exception 'Starting CI for % is already frozen by a match.', p.name;
    end if;
    prior_ci := null;
    last_match := null;
    date_basis := 'Unknown';
    -- Live seasons: sum all contests from the player's final match, using its
    -- frozen pre-match CI. Match calendar order, never publication timestamps.
    select (min(f.clash_index_before) + sum(f.ci_delta))::integer, m.date
      into prior_ci, last_match
      from public.clash_contest_rating_facts f
      join public.launch_schedule_matches m on m.id = f.match_id
      where f.player_id = p.id and m.season_id = prior.id
      group by m.id, m.date, m.time order by m.date desc, m.time desc, m.id desc limit 1;
    if last_match is not null then date_basis := 'Exact'; end if;
    if prior_ci is null then
      select s.rating into prior_ci from public.clash_rating_season_snapshots s
        where s.player_id = p.id and s.season_id = prior.id
        order by s.calculated_at desc, s.algorithm_version desc limit 1;
      select h.event_month, tm.played_on into historical
        from public.historical_player_matchups h
        left join public.historical_team_matches tm on tm.id = h.historical_team_match_id
        where h.player_id = p.id and h.season_id = prior.id
        order by h.event_order desc, tm.played_on desc nulls last, h.deduplication_key limit 1;
      if found then
        last_match := historical.played_on;
        if last_match is not null then
          date_basis := 'Exact';
        else
          month_number := array_position(array['january','february','march','april','may','june','july','august','september','october','november','december'], lower(btrim(historical.event_month)));
          if month_number is not null and prior.start_date is not null then
            match_year := extract(year from prior.start_date)::integer + case when month_number < extract(month from prior.start_date) then 1 else 0 end;
            last_match := (make_date(match_year, month_number, 1) + interval '1 month - 1 day')::date;
            date_basis := 'MonthUpperBound';
          end if;
        end if;
      end if;
    end if;
    -- Missing prior snapshots must not silently turn an established player into
    -- a new player. A skipped season also needs an explicit reviewed seed.
    if prior_ci is null and (
      exists (select 1 from public.historical_player_matchups h where h.player_id = p.id)
      or exists (select 1 from public.clash_contest_rating_facts f where f.player_id = p.id)
      or exists (select 1 from public.clash_rating_season_snapshots s where s.player_id = p.id)
    ) then
      raise exception 'Missing prior final CI for returning player %.', p.name;
    end if;
    if prior_ci is null and p.pdga_rating is null and p.gender not in ('Male','Female') then
      raise exception 'A division or PDGA seed is required for %.', p.name;
    end if;
    effective_on := p.pdga_rating_effective_date;
    if effective_on > (now() at time zone 'America/New_York')::date then
      raise exception 'PDGA effective date for % is in the future.', p.name;
    end if;
    start_ci := private.clash_season_start_ci(prior_ci, p.pdga_rating, effective_on, last_match,
      case when p.gender = 'Female' then 'Women' else 'Open' end);
    rule_name := case
      when prior_ci is null and p.pdga_rating is null then 'Provisional'
      when prior_ci is null then 'NewPdga'
      when p.pdga_rating is null then 'CarryForward'
      when effective_on > last_match then 'RecentPdga50'
      else 'Pdga20' end;
    result := result || jsonb_build_array(jsonb_build_object(
      'playerId', p.id, 'name', p.name, 'previousCi', p.clash_index, 'startingCi', start_ci,
      'priorFinalCi', prior_ci, 'pdgaRating', p.pdga_rating, 'pdgaRatingEffectiveDate', effective_on,
      'priorFinalMatchDate', last_match, 'matchDateBasis', date_basis, 'rule', rule_name));
    if not preview_only then
      insert into public.clash_season_rollovers(season_id,player_id,prior_season_id,prior_final_ci,
        prior_final_match_date,match_date_basis,pdga_rating,pdga_rating_effective_date,starting_ci,rule,applied_by)
      values(target.id,p.id,prior.id,prior_ci,last_match,date_basis,p.pdga_rating,effective_on,start_ci,rule_name,auth.uid())
      on conflict(season_id,player_id) do update set
        prior_season_id=excluded.prior_season_id,prior_final_ci=excluded.prior_final_ci,
        prior_final_match_date=excluded.prior_final_match_date,match_date_basis=excluded.match_date_basis,
        pdga_rating=excluded.pdga_rating,pdga_rating_effective_date=excluded.pdga_rating_effective_date,
        starting_ci=excluded.starting_ci,rule=excluded.rule,applied_at=now(),applied_by=excluded.applied_by;
      perform set_config('app.clash_rating_engine_write', 'on', true);
      update public.launch_players set clash_index = start_ci,
        clash_index_provisional = (rule_name = 'Provisional'), updated_at = now() where id = p.id;
      perform set_config('app.clash_rating_engine_write', engine_setting, true);
    end if;
  end loop;
  if target_player_id is not null and jsonb_array_length(result) = 0 then
    raise exception 'Player is not on the active roster for this season.';
  end if;
  return jsonb_build_object('preview',preview_only,'seasonId',target.id,'players',result);
end;
$$;
