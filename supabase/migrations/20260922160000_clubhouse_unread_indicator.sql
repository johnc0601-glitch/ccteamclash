-- Track per-member Clubhouse read state and expose team-scoped activity for unread checks.
create table if not exists public.launch_clubhouse_reads (
  profile_id text not null references public.launch_profiles(id) on delete cascade,
  season_id text not null references public.launch_seasons(id) on delete cascade,
  team_id text not null references public.launch_teams(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (profile_id, season_id, team_id)
);

alter table public.launch_clubhouse_reads enable row level security;

create policy "clubhouse reads select own"
on public.launch_clubhouse_reads
for select
to authenticated
using (
  exists (
    select 1
    from public.launch_profiles p
    where p.id = profile_id
      and p.user_id = (select auth.uid())
      and p.status = 'Approved'
  )
  and private.clubhouse_can_access(season_id, team_id)
);

create policy "clubhouse reads insert own"
on public.launch_clubhouse_reads
for insert
to authenticated
with check (
  exists (
    select 1
    from public.launch_profiles p
    where p.id = profile_id
      and p.user_id = (select auth.uid())
      and p.status = 'Approved'
  )
  and private.clubhouse_can_access(season_id, team_id)
);

create policy "clubhouse reads update own"
on public.launch_clubhouse_reads
for update
to authenticated
using (
  exists (
    select 1
    from public.launch_profiles p
    where p.id = profile_id
      and p.user_id = (select auth.uid())
      and p.status = 'Approved'
  )
  and private.clubhouse_can_access(season_id, team_id)
)
with check (
  exists (
    select 1
    from public.launch_profiles p
    where p.id = profile_id
      and p.user_id = (select auth.uid())
      and p.status = 'Approved'
  )
  and private.clubhouse_can_access(season_id, team_id)
);

grant select, insert, update on public.launch_clubhouse_reads to authenticated;

create or replace view public.launch_clubhouse_activity
with (security_invoker = true)
as
select
  p.id as activity_id,
  p.season_id,
  p.team_id,
  p.author_profile_id,
  p.created_at,
  'post'::text as activity_type
from public.launch_clubhouse_posts p
where p.deleted_at is null

union all

select
  c.id as activity_id,
  p.season_id,
  p.team_id,
  c.author_profile_id,
  c.created_at,
  'comment'::text as activity_type
from public.launch_clubhouse_comments c
join public.launch_clubhouse_posts p on p.id = c.post_id
where c.deleted_at is null
  and p.deleted_at is null;

grant select on public.launch_clubhouse_activity to authenticated;
