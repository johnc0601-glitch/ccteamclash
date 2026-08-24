create or replace function private.guard_launch_match_roster_unlock_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  commissioner_profile_id text;
  target_match record;
  lock_at timestamptz;
begin
  select profile.id
  into commissioner_profile_id
  from public.launch_profiles profile
  where profile.user_id = (select auth.uid())
    and profile.status = 'Approved'
    and profile.role = 'Commissioner'
  limit 1;

  if commissioner_profile_id is null then
    raise exception 'Commissioner access is required.' using errcode='42501';
  end if;

  select match.id, match.date, match.status, match.home_team_id, match.away_team_id
  into target_match
  from public.launch_schedule_matches match
  where match.id = new.match_id
  for share;

  if target_match.id is null
     or target_match.date is null
     or target_match.status not in ('Scheduled', 'Postponed', 'Rain Delay')
     or new.team_id not in (target_match.home_team_id, target_match.away_team_id)
  then
    raise exception 'That roster cannot be unlocked.' using errcode='22023';
  end if;

  lock_at := (target_match.date::timestamp + time '15:00') at time zone 'America/New_York';
  if pg_catalog.now() < lock_at then
    raise exception 'That roster is not locked yet.' using errcode='55000';
  end if;

  new.unlocked_by := commissioner_profile_id;
  new.unlocked_at := pg_catalog.now();
  new.relocked_at := null;
  new.relocked_by := null;
  return new;
end;
$$;

drop trigger if exists launch_match_roster_unlock_insert_guard on public.launch_match_roster_unlocks;
create trigger launch_match_roster_unlock_insert_guard
before insert on public.launch_match_roster_unlocks
for each row execute function private.guard_launch_match_roster_unlock_insert();
