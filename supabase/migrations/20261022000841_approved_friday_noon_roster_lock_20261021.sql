-- Approved Friday 12:00 PM ET match-roster lock (all match weeks).
-- Replace the shared helper without touching historical scores/snapshots.
create or replace function private.launch_match_lock_at(match_date date)
returns timestamptz
language sql
immutable
set search_path to ''
as $function$
  select (
    (match_date - ((extract(dow from match_date)::integer - 5 + 7) % 7))
    + time '12:00'
  ) at time zone 'America/New_York';
$function$;
revoke all on function private.launch_match_lock_at(date)
from public, anon, authenticated;
