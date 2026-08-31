create table if not exists public.launch_match_feed_reports (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.launch_schedule_matches(id) on update cascade on delete cascade,
  post_id uuid references public.launch_match_feed_posts(id) on update cascade on delete cascade,
  comment_id uuid references public.launch_match_feed_comments(id) on update cascade on delete cascade,
  reporter_profile_id text not null references public.launch_profiles(id) on update cascade on delete cascade,
  reason text not null default 'Other',
  note text not null default '',
  status text not null default 'Pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_profile_id text references public.launch_profiles(id) on update cascade on delete set null,
  resolution_note text not null default '',
  constraint launch_match_feed_reports_one_target check ((post_id is null) <> (comment_id is null)),
  constraint launch_match_feed_reports_reason_check check (reason in ('Spam','Harassment','Inappropriate','Other')),
  constraint launch_match_feed_reports_status_check check (status in ('Pending','Resolved','Dismissed'))
);

create unique index if not exists launch_match_feed_reports_pending_post_unique
  on public.launch_match_feed_reports(reporter_profile_id, post_id)
  where post_id is not null and status = 'Pending';

create unique index if not exists launch_match_feed_reports_pending_comment_unique
  on public.launch_match_feed_reports(reporter_profile_id, comment_id)
  where comment_id is not null and status = 'Pending';

create index if not exists launch_match_feed_reports_status_created_idx
  on public.launch_match_feed_reports(status, created_at desc);

create index if not exists launch_match_feed_reports_match_idx
  on public.launch_match_feed_reports(match_id, created_at desc);

create index if not exists launch_match_feed_reports_post_idx
  on public.launch_match_feed_reports(post_id)
  where post_id is not null;

create index if not exists launch_match_feed_reports_comment_idx
  on public.launch_match_feed_reports(comment_id)
  where comment_id is not null;

alter table public.launch_match_feed_reports enable row level security;

create policy "members create own match feed reports"
  on public.launch_match_feed_reports
  for insert
  to authenticated
  with check (
    reporter_profile_id = (
      select profile.id from public.launch_profiles profile
      where profile.user_id = (select auth.uid())
      limit 1
    )
  );

create policy "members read own or commissioners read match feed reports"
  on public.launch_match_feed_reports
  for select
  to authenticated
  using (
    reporter_profile_id = (
      select profile.id from public.launch_profiles profile
      where profile.user_id = (select auth.uid())
      limit 1
    )
    or (select private.is_launch_commissioner())
  );

create policy "commissioners update match feed reports"
  on public.launch_match_feed_reports
  for update
  to authenticated
  using ((select private.is_launch_commissioner()))
  with check ((select private.is_launch_commissioner()));
