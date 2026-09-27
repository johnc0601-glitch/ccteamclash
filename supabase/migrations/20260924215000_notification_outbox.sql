-- Server-only notification outbox. Delivery is intentionally separate from event creation.

create table if not exists public.launch_notification_outbox (
  id uuid primary key default gen_random_uuid(),
  profile_id text not null references public.launch_profiles(id) on delete cascade,
  category text not null check (
    category in (
      'match_reminders',
      'roster_deadline',
      'matchday_open',
      'results_ci',
      'captain_announcements',
      'league_stories'
    )
  ),
  title text not null check (char_length(title) between 1 and 180),
  body text not null default '' check (char_length(body) <= 500),
  url text not null default '/',
  source_type text not null,
  source_id text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 days'),
  sent_at timestamptz,
  skipped_at timestamptz,
  attempts integer not null default 0,
  last_error text,
  unique (profile_id, category, source_type, source_id)
);

create index if not exists launch_notification_outbox_pending_idx
  on public.launch_notification_outbox(created_at)
  where sent_at is null and skipped_at is null;

create index if not exists launch_notification_outbox_profile_idx
  on public.launch_notification_outbox(profile_id, created_at desc);

alter table public.launch_notification_outbox enable row level security;

revoke all on public.launch_notification_outbox from anon, authenticated;

comment on table public.launch_notification_outbox is
  'Server-only queued notification events. Push delivery is handled separately and only for subscriptions active when the event is created.';
