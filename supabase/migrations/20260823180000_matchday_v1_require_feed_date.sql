create or replace function private.is_launch_match_feed_open(target_match_id text, at_time timestamptz default pg_catalog.now())
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      ((match.date + 31)::timestamp at time zone 'America/New_York') > at_time
    ),
    false
  )
  from public.launch_schedule_matches match
  where match.id = target_match_id;
$$;

revoke all on function private.is_launch_match_feed_open(text,timestamptz) from public;
grant execute on function private.is_launch_match_feed_open(text,timestamptz) to authenticated;
