-- Keep the database snapshot guard aligned with the application rule:
-- rosters lock at 3 PM America/New_York on the Friday of match week.
-- The previous helper used the match date itself, which delayed Saturday
-- snapshots until Saturday at 3 PM even though the UI locked on Friday.
create or replace function private.launch_match_lock_at(match_date date)
returns timestamptz
language sql
immutable
set search_path to ''
as $function$
  select (
    (
      match_date
      - ((extract(dow from match_date)::integer - 5 + 7) % 7)
    )
    + time '15:00'
  ) at time zone 'America/New_York';
$function$;

revoke all on function private.launch_match_lock_at(date)
from public, anon, authenticated;
