create or replace function private.is_launch_match_attendance_open_at(match_id text, check_at timestamp with time zone)
returns boolean
language sql
stable
security definer
set search_path to ''
as $function$
  select exists (
    select 1
    from public.launch_schedule_matches match
    where match.id = match_id
      and match.status in ('Scheduled', 'Postponed', 'Rain Delay')
      and match.date is not null
      and check_at < private.launch_match_lock_at(match.date)
  );
$function$;
