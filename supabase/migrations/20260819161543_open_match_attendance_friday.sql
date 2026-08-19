create or replace function private.launch_match_attendance_open_at(match_date date)
returns timestamptz
language sql
immutable
security invoker
set search_path = ''
as $$
  select (
    match_date
    - (((extract(dow from match_date)::integer - 5 + 7) % 7))
    + time '00:00'
  ) at time zone 'America/New_York';
$$;

revoke all on function private.launch_match_attendance_open_at(date)
from public, anon, authenticated, service_role;

create or replace function private.is_launch_match_attendance_open_at(
  match_id text,
  check_at timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.launch_schedule_matches match
    where match.id = match_id
      and match.status in ('Scheduled', 'Postponed', 'Rain Delay')
      and match.date is not null
      and check_at >= private.launch_match_attendance_open_at(match.date)
      and check_at < private.launch_match_lock_at(match.date)
  );
$$;
