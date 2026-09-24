-- Queue time-based Team Clash notifications using existing roster timing policy.
-- Push delivery remains separate; this only creates deduplicated outbox rows.

create or replace function public.queue_due_team_clash_notifications(
  run_at timestamptz default now()
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  queued_count integer := 0;
  inserted_count integer := 0;
begin
  -- Match week opens at Friday 12:00 AM Eastern, matching MatchRosterLock.ts.
  with due_matches as (
    select
      match.id,
      match.season_id,
      match.home_team_id,
      match.away_team_id,
      match.public_slug,
      away.short_name as away_short_name,
      home.short_name as home_short_name,
      (
        (
          match.date
          - (((extract(dow from match.date)::integer - 5 + 7) % 7) * interval '1 day')
        )::date::timestamp
        at time zone 'America/New_York'
      ) as open_at
    from public.launch_schedule_matches match
    join public.launch_teams away on away.id = match.away_team_id
    join public.launch_teams home on home.id = match.home_team_id
    where match.date is not null
      and match.status in ('Scheduled', 'Postponed', 'Rain Delay')
  ),
  recipient_profiles as (
    select distinct
      due.id as match_id,
      due.public_slug,
      due.away_short_name,
      due.home_short_name,
      profile.id as profile_id
    from due_matches due
    join public.launch_season_roster_memberships membership
      on membership.season_id = due.season_id
     and membership.team_id in (due.home_team_id, due.away_team_id)
     and membership.status = 'Active'
    join public.launch_profiles profile
      on profile.player_id = membership.player_id
     and profile.status = 'Approved'
     and profile.user_id is not null
    left join public.launch_notification_preferences preference
      on preference.profile_id = profile.id
    where due.open_at <= run_at
      and due.open_at > run_at - interval '1 hour'
      and coalesce(preference.matchday_open, true)
      and exists (
        select 1
        from public.launch_push_subscriptions subscription
        where subscription.profile_id = profile.id
          and subscription.enabled
      )
  )
  insert into public.launch_notification_outbox(
    profile_id,
    category,
    title,
    body,
    url,
    source_type,
    source_id,
    expires_at
  )
  select
    recipient.profile_id,
    'matchday_open',
    ('Match week open: ' || recipient.away_short_name || ' at ' || recipient.home_short_name)::text,
    'Set your availability before Friday at 12:00 PM Eastern.',
    '/matches/' || coalesce(recipient.public_slug, recipient.match_id),
    'match_week_open',
    recipient.match_id,
    run_at + interval '16 hours'
  from recipient_profiles recipient
  on conflict (profile_id, category, source_type, source_id) do nothing;

  get diagnostics inserted_count = row_count;
  queued_count := queued_count + inserted_count;

  -- At Friday noon Eastern, player availability is locked. Notify team captains
  -- that the current code's official roster lock follows at 3:00 PM Eastern.
  with due_matches as (
    select
      match.id,
      match.home_team_id,
      match.away_team_id,
      match.public_slug,
      away.short_name as away_short_name,
      home.short_name as home_short_name,
      (
        (
          match.date
          - (((extract(dow from match.date)::integer - 5 + 7) % 7) * interval '1 day')
        )::date::timestamp
        + interval '12 hours'
      ) at time zone 'America/New_York' as attendance_lock_at
    from public.launch_schedule_matches match
    join public.launch_teams away on away.id = match.away_team_id
    join public.launch_teams home on home.id = match.home_team_id
    where match.date is not null
      and match.status in ('Scheduled', 'Postponed', 'Rain Delay')
  ),
  captain_profiles as (
    select distinct
      due.id as match_id,
      due.public_slug,
      due.away_short_name,
      due.home_short_name,
      profile.id as profile_id
    from due_matches due
    join public.launch_profiles profile
      on profile.captain_team_id in (due.home_team_id, due.away_team_id)
     and profile.status = 'Approved'
     and profile.user_id is not null
    left join public.launch_notification_preferences preference
      on preference.profile_id = profile.id
    where due.attendance_lock_at <= run_at
      and due.attendance_lock_at > run_at - interval '1 hour'
      and coalesce(preference.roster_deadline, true)
      and exists (
        select 1
        from public.launch_push_subscriptions subscription
        where subscription.profile_id = profile.id
          and subscription.enabled
      )
  )
  insert into public.launch_notification_outbox(
    profile_id,
    category,
    title,
    body,
    url,
    source_type,
    source_id,
    expires_at
  )
  select
    captain.profile_id,
    'roster_deadline',
    ('Availability locked: ' || captain.away_short_name || ' at ' || captain.home_short_name)::text,
    'Player responses are closed. Finalize the match roster before the 3:00 PM Eastern roster lock.',
    '/matches/' || coalesce(captain.public_slug, captain.match_id),
    'attendance_lock',
    captain.match_id,
    run_at + interval '3 hours'
  from captain_profiles captain
  on conflict (profile_id, category, source_type, source_id) do nothing;

  get diagnostics inserted_count = row_count;
  queued_count := queued_count + inserted_count;

  return queued_count;
end;
$$;

revoke all on function public.queue_due_team_clash_notifications(timestamptz)
from public, anon, authenticated;

comment on function public.queue_due_team_clash_notifications(timestamptz) is
  'Queues Matchday-open and captain roster notifications using the same Friday Eastern checkpoints as MatchRosterLock.ts.';
