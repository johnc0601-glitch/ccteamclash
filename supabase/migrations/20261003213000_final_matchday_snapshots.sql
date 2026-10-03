create table if not exists public.launch_match_final_snapshots (
  match_id text primary key references public.launch_schedule_matches(id) on delete cascade,
  route_keys text[] not null default '{}',
  payload jsonb not null default '{}'::jsonb,
  weather jsonb null,
  locked boolean not null default true,
  published_at timestamptz null,
  updated_at timestamptz not null default now()
);

create index if not exists launch_match_final_snapshots_route_keys_idx
  on public.launch_match_final_snapshots using gin (route_keys);

alter table public.launch_match_final_snapshots enable row level security;

grant select on public.launch_match_final_snapshots to anon, authenticated;
grant update (weather) on public.launch_match_final_snapshots to authenticated;

drop policy if exists "public reads locked final match snapshots" on public.launch_match_final_snapshots;
create policy "public reads locked final match snapshots"
on public.launch_match_final_snapshots for select to anon, authenticated
using (locked = true);

drop policy if exists "commissioners update final match weather" on public.launch_match_final_snapshots;
create policy "commissioners update final match weather"
on public.launch_match_final_snapshots for update to authenticated
using ((select private.is_launch_commissioner()))
with check ((select private.is_launch_commissioner()));

create or replace function private.refresh_launch_match_final_snapshot(target_match_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
declare
  match_row public.launch_schedule_matches%rowtype;
  result_row public.launch_match_results%rowtype;
  round_number integer;
  away_team jsonb;
  home_team jsonb;
  course_info jsonb;
  contest_rows jsonb;
  keys text[];
begin
  select * into match_row
  from public.launch_schedule_matches
  where id = target_match_id;

  select * into result_row
  from public.launch_match_results
  where match_id = target_match_id;

  if match_row.id is null or result_row.match_id is null or result_row.status <> 'Published' then
    return;
  end if;

  select number into round_number
  from public.launch_rounds
  where id = match_row.round_id;

  select jsonb_build_object(
    'id', team.id,
    'name', team.name,
    'shortName', team.short_name,
    'logo', team.logo,
    'primaryColor', team.primary_color,
    'secondaryColor', team.secondary_color
  )
  into away_team
  from public.launch_teams team
  where team.id = match_row.away_team_id;

  select jsonb_build_object(
    'id', team.id,
    'name', team.name,
    'shortName', team.short_name,
    'logo', team.logo,
    'primaryColor', team.primary_color,
    'secondaryColor', team.secondary_color
  )
  into home_team
  from public.launch_teams team
  where team.id = match_row.home_team_id;

  select jsonb_build_object(
    'id', course.id,
    'name', course.name,
    'mapUrl', course.map_url
  )
  into course_info
  from public.launch_courses course
  where course.id = match_row.course_id;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'id', contest.id,
      'format', contest.format,
      'position', contest.position,
      'awayOutcome', contest.away_outcome,
      'homeOutcome', contest.home_outcome,
      'awayPlayers', coalesce((
        select jsonb_agg(
          jsonb_build_object('id', player.player_id, 'name', player.player_name)
          order by player.slot
        )
        from public.launch_result_contest_players player
        where player.contest_id = contest.id and player.side = 'Away'
      ), '[]'::jsonb),
      'homePlayers', coalesce((
        select jsonb_agg(
          jsonb_build_object('id', player.player_id, 'name', player.player_name)
          order by player.slot
        )
        from public.launch_result_contest_players player
        where player.contest_id = contest.id and player.side = 'Home'
      ), '[]'::jsonb)
    )
    order by case contest.format when 'Singles' then 1 else 2 end, contest.position
  ), '[]'::jsonb)
  into contest_rows
  from public.launch_result_contests contest
  where contest.match_id = target_match_id;

  select array_agg(distinct key_value)
  into keys
  from unnest(
    array_remove(
      array_cat(
        array[match_row.id, match_row.public_slug],
        coalesce((
          select array_agg(alias)
          from public.launch_match_url_aliases
          where match_id = target_match_id
        ), '{}'::text[])
      ),
      null
    )
  ) as key_value;

  insert into public.launch_match_final_snapshots (
    match_id,
    route_keys,
    payload,
    locked,
    published_at,
    updated_at
  )
  values (
    target_match_id,
    coalesce(keys, array[target_match_id]),
    jsonb_build_object(
      'version', 1,
      'matchId', target_match_id,
      'roundNumber', round_number,
      'date', match_row.date,
      'time', match_row.time,
      'course', coalesce(course_info, '{}'::jsonb),
      'awayTeam', coalesce(away_team, '{}'::jsonb),
      'homeTeam', coalesce(home_team, '{}'::jsonb),
      'awayScore', result_row.away_score,
      'homeScore', result_row.home_score,
      'contests', contest_rows
    ),
    true,
    result_row.published_at,
    now()
  )
  on conflict (match_id) do update
  set route_keys = excluded.route_keys,
      payload = excluded.payload,
      locked = true,
      published_at = excluded.published_at,
      updated_at = now();
end;
$function$;

revoke all on function private.refresh_launch_match_final_snapshot(text) from public;

create or replace function private.sync_launch_match_final_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.status = 'Published' then
    perform private.refresh_launch_match_final_snapshot(new.match_id);
  elsif tg_op = 'UPDATE' and old.status = 'Published' and new.status <> 'Published' then
    update public.launch_match_final_snapshots
    set locked = false, updated_at = now()
    where match_id = new.match_id;
  end if;
  return new;
end;
$function$;

revoke all on function private.sync_launch_match_final_snapshot() from public;

drop trigger if exists sync_launch_match_final_snapshot on public.launch_match_results;
create trigger sync_launch_match_final_snapshot
after insert or update of status, home_score, away_score, published_at
on public.launch_match_results
for each row execute function private.sync_launch_match_final_snapshot();

do $function$
declare
  result_row record;
begin
  for result_row in
    select match_id from public.launch_match_results where status = 'Published'
  loop
    perform private.refresh_launch_match_final_snapshot(result_row.match_id);
  end loop;
end;
$function$;
