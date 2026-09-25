-- Clubhouse captain moderation: soft removal + auditable moderator actions.

create table if not exists public.launch_clubhouse_moderation_events (
  id uuid primary key default gen_random_uuid(),
  season_id text not null references public.launch_seasons(id) on delete cascade,
  team_id text not null references public.launch_teams(id) on delete cascade,
  content_type text not null check (content_type in ('post','comment')),
  content_id uuid not null,
  content_author_profile_id text references public.launch_profiles(id) on delete set null,
  moderator_profile_id text not null references public.launch_profiles(id) on delete restrict,
  action text not null default 'remove' check (action in ('remove')),
  reason text not null check (char_length(reason) between 1 and 120),
  created_at timestamptz not null default now()
);

create index if not exists launch_clubhouse_moderation_context_idx
  on public.launch_clubhouse_moderation_events(season_id, team_id, created_at desc);
create index if not exists launch_clubhouse_moderation_moderator_idx
  on public.launch_clubhouse_moderation_events(moderator_profile_id, created_at desc);

alter table public.launch_clubhouse_moderation_events enable row level security;

drop policy if exists "clubhouse moderation admins select" on public.launch_clubhouse_moderation_events;
create policy "clubhouse moderation admins select"
on public.launch_clubhouse_moderation_events
for select
to authenticated
using (private.clubhouse_is_team_admin(season_id, team_id));

drop policy if exists "clubhouse moderation admins insert" on public.launch_clubhouse_moderation_events;
create policy "clubhouse moderation admins insert"
on public.launch_clubhouse_moderation_events
for insert
to authenticated
with check (
  private.clubhouse_is_team_admin(season_id, team_id)
  and exists (
    select 1
    from public.launch_profiles profile
    where profile.id = moderator_profile_id
      and profile.user_id = (select auth.uid())
      and profile.status = 'Approved'
  )
);

grant select, insert on public.launch_clubhouse_moderation_events to authenticated;

-- Authors may still edit their own comments. Team captains/commissioners may
-- soft-remove comments in the Clubhouse they administer.
drop policy if exists "clubhouse comments update" on public.launch_clubhouse_comments;
create policy "clubhouse comments update"
on public.launch_clubhouse_comments
for update
to authenticated
using (
  exists (
    select 1
    from public.launch_profiles profile
    where profile.id = author_profile_id
      and profile.user_id = (select auth.uid())
  )
  or exists (
    select 1
    from public.launch_clubhouse_posts post
    where post.id = post_id
      and private.clubhouse_is_team_admin(post.season_id, post.team_id)
  )
)
with check (
  exists (
    select 1
    from public.launch_clubhouse_posts post
    where post.id = post_id
      and private.clubhouse_can_access(post.season_id, post.team_id)
  )
);
