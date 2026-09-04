-- Match Identity V2 database guards.

create or replace function private.prevent_launch_match_id_change()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'launch_schedule_matches.id is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_launch_match_id_change on public.launch_schedule_matches;
create trigger prevent_launch_match_id_change
before update of id on public.launch_schedule_matches
for each row execute function private.prevent_launch_match_id_change();

create or replace function private.protect_recorded_match_structure()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
begin
  if (
    new.home_team_id is distinct from old.home_team_id
    or new.away_team_id is distinct from old.away_team_id
    or new.round_id is distinct from old.round_id
    or new.season_id is distinct from old.season_id
  ) and exists (
    select 1
    from public.launch_match_results result
    where result.match_id = old.id
  ) then
    raise exception 'Recorded match structure is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_recorded_match_structure on public.launch_schedule_matches;
create trigger protect_recorded_match_structure
before update of home_team_id, away_team_id, round_id, season_id
on public.launch_schedule_matches
for each row execute function private.protect_recorded_match_structure();
