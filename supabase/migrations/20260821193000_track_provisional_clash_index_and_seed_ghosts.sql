alter table public.launch_players
  add column if not exists clash_index_provisional boolean not null default false;

create or replace function private.apply_clash_rating_snapshot(p_season_id text, p_algorithm_version text)
returns integer
language plpgsql
security definer
set search_path to 'public', 'private'
as $function$
declare
  changed integer;
begin
  perform set_config('app.clash_rating_engine_write', 'on', true);

  update public.launch_players p
  set clash_index = s.rating,
      clash_index_provisional = s.provisional,
      updated_at = now()
  from public.clash_rating_season_snapshots s
  where s.season_id = p_season_id
    and s.algorithm_version = p_algorithm_version
    and s.player_id = p.id;

  get diagnostics changed = row_count;
  perform set_config('app.clash_rating_engine_write', 'off', true);
  return changed;
exception when others then
  perform set_config('app.clash_rating_engine_write', 'off', true);
  raise;
end;
$function$;

create or replace function private.protect_launch_player_league_fields()
returns trigger
language plpgsql
set search_path to 'public', 'private'
as $function$
begin
  if current_setting('app.clash_rating_engine_write', true) = 'on'
     and current_user in ('postgres', 'service_role') then
    return new;
  end if;

  if private.is_launch_commissioner() then
    return new;
  end if;

  if exists (
    select 1
    from public.launch_profiles profile
    where profile.user_id = (select auth.uid())
      and profile.status = 'Approved'
      and profile.role = 'Captain'
      and profile.captain_team_id = new.current_team_id
  )
  and new.id is not distinct from old.id
  and new.name is not distinct from old.name
  and new.pdga_number is not distinct from old.pdga_number
  and new.pdga_rating is not distinct from old.pdga_rating
  and new.clash_index is not distinct from old.clash_index
  and new.clash_index_provisional is not distinct from old.clash_index_provisional
  and new.home_area is not distinct from old.home_area
  and new.created_at is not distinct from old.created_at
  then
    return new;
  end if;

  if new.id is distinct from old.id
    or new.gender is distinct from old.gender
    or new.pdga_number is distinct from old.pdga_number
    or new.pdga_rating is distinct from old.pdga_rating
    or new.clash_index is distinct from old.clash_index
    or new.clash_index_provisional is distinct from old.clash_index_provisional
    or new.current_team_id is distinct from old.current_team_id
    or new.home_area is distinct from old.home_area
    or new.active is distinct from old.active
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Only the linked player name can be changed here.';
  end if;

  return new;
end;
$function$;

select set_config('app.clash_rating_engine_write', 'on', true);
with active_season as (
  select id
  from public.launch_seasons
  where active = true and published = true
  order by year desc
  limit 1
)
update public.launch_players p
set clash_index = 850,
    clash_index_provisional = true,
    updated_at = now()
from public.launch_season_roster_memberships m, active_season s
where m.season_id = s.id
  and m.player_id = p.id
  and m.status = 'Active'
  and m.roster_category = 'Men'
  and p.clash_index is null
  and p.pdga_rating is null
  and p.gender = 'Male';
select set_config('app.clash_rating_engine_write', 'off', true);
