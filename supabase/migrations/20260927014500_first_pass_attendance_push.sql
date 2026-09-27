-- First-pass Team Clash push policy:
-- Friday 9:00 AM Eastern reminder only when the player has not answered attendance.

alter table public.launch_notification_preferences
  alter column match_reminders set default true,
  alter column roster_deadline set default false,
  alter column matchday_open set default false,
  alter column results_ci set default false,
  alter column captain_announcements set default false,
  alter column league_stories set default false;

update public.launch_notification_preferences
set match_reminders = true,
    roster_deadline = false,
    matchday_open = false,
    results_ci = false,
    captain_announcements = false,
    league_stories = false,
    updated_at = now();

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
begin
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
          (
            match.date
            - (((extract(dow from match.date)::integer - 5 + 7) % 7) * interval '1 day')
          )::date::timestamp
          + interval '9 hours'
        ) at time zone 'America/New_York'
      ) as reminder_at
    from public.launch_schedule_matches match
    join public.launch_teams away on away.id = match.away_team_id
    join public.launch_teams home on home.id = match.home_team_id
    where match.date is not null
      and match.status in ('Scheduled', 'Postponed', 'Rain Delay')
  ),
  recipients as (
    select distinct
      due.id as match_id,
      due.public_slug,
      due.away_short_name,
      due.home_short_name,
      due.reminder_at,
      membership.player_id,
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
    where due.reminder_at <= run_at
      and due.reminder_at > run_at - interval '15 minutes'
      and coalesce(preference.match_reminders, true)
      and not exists (
        select 1
        from public.launch_match_attendance attendance
        where attendance.match_id = due.id
          and attendance.player_id = membership.player_id
      )
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
    'match_reminders',
    ('Attendance needed: ' || recipient.away_short_name || ' at ' || recipient.home_short_name)::text,
    'Please mark Playing or Not Playing before noon today.',
    '/matches/' || coalesce(recipient.public_slug, recipient.match_id),
    'friday_attendance_reminder',
    recipient.match_id,
    recipient.reminder_at + interval '3 hours'
  from recipients recipient
  on conflict (profile_id, category, source_type, source_id) do nothing;

  get diagnostics queued_count = row_count;
  return queued_count;
end;
$$;

revoke all on function public.queue_due_team_clash_notifications(timestamptz)
from public, anon, authenticated;

comment on function public.queue_due_team_clash_notifications(timestamptz) is
  'Queues only the Friday 9:00 AM Eastern attendance reminder, and only for active rostered players who have not answered attendance.';
