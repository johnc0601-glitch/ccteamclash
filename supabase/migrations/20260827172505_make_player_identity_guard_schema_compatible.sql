create or replace function private.protect_launch_player_league_fields()
returns trigger
language plpgsql
set search_path to 'public', 'private'
as $function$
begin
  if new.gender is distinct from old.gender
     and private.is_launch_player_gender_locked(old.id)
     and not (
       current_setting('app.player_gender_repair_write', true) = 'on'
       and current_user in ('postgres', 'service_role')
     )
  then
    raise exception 'Player gender is permanently locked because a season has started.' using errcode = '23514';
  end if;

  if current_setting('app.clash_rating_engine_write', true) = 'on'
     and current_user in ('postgres', 'service_role') then
    return new;
  end if;

  if current_setting('app.captain_registration_write', true) = 'on'
     and current_user in ('postgres', 'service_role')
     and new.id is not distinct from old.id
     and new.clash_index is not distinct from old.clash_index
     and (to_jsonb(new) -> 'clash_index_provisional') is not distinct from (to_jsonb(old) -> 'clash_index_provisional')
     and new.current_team_id is not distinct from old.current_team_id
     and new.home_area is not distinct from old.home_area
     and new.active is not distinct from old.active
     and new.created_at is not distinct from old.created_at
  then
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
  and (to_jsonb(new) -> 'clash_index_provisional') is not distinct from (to_jsonb(old) -> 'clash_index_provisional')
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
    or (to_jsonb(new) -> 'clash_index_provisional') is distinct from (to_jsonb(old) -> 'clash_index_provisional')
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
