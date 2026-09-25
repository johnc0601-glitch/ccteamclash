-- Clubhouse member reports. Reports are visible only to that team's captain(s) and commissioners.

create table if not exists public.launch_clubhouse_reports (
  id uuid primary key default gen_random_uuid(),
  season_id text not null references public.launch_seasons(id) on delete cascade,
  team_id text not null references public.launch_teams(id) on delete cascade,
  content_type text not null check (content_type in ('post','comment')),
  content_id uuid not null,
  content_author_profile_id text not null references public.launch_profiles(id) on delete restrict,
  reporter_profile_id text not null references public.launch_profiles(id) on delete cascade,
  reason text not null check (reason in ('Spam','Harassment','Inappropriate','Off-topic','Other')),
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'Open' check (status in ('Open','Reviewed','Dismissed','Removed')),
  reviewed_by_profile_id text references public.launch_profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (reporter_profile_id, content_type, content_id)
);

create index if not exists launch_clubhouse_reports_team_status_idx
  on public.launch_clubhouse_reports(season_id, team_id, status, created_at desc);

create or replace function private.clubhouse_validate_report()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  target_season text;
  target_team text;
  target_author text;
  target_deleted timestamptz;
begin
  if new.content_type = 'post' then
    select p.season_id, p.team_id, p.author_profile_id, p.deleted_at
      into target_season, target_team, target_author, target_deleted
    from public.launch_clubhouse_posts p
    where p.id = new.content_id;
  else
    select p.season_id, p.team_id, c.author_profile_id, c.deleted_at
      into target_season, target_team, target_author, target_deleted
    from public.launch_clubhouse_comments c
    join public.launch_clubhouse_posts p on p.id = c.post_id
    where c.id = new.content_id;
  end if;

  if target_season is null or target_team is null or target_deleted is not null then
    raise exception 'Clubhouse content is not available to report.' using errcode = '22023';
  end if;

  if target_author = new.reporter_profile_id then
    raise exception 'Members cannot report their own Clubhouse content.' using errcode = '22023';
  end if;

  new.season_id := target_season;
  new.team_id := target_team;
  new.content_author_profile_id := target_author;
  return new;
end;
$$;

drop trigger if exists clubhouse_validate_report on public.launch_clubhouse_reports;
create trigger clubhouse_validate_report
before insert on public.launch_clubhouse_reports
for each row execute function private.clubhouse_validate_report();

alter table public.launch_clubhouse_reports enable row level security;

drop policy if exists "clubhouse reports insert" on public.launch_clubhouse_reports;
create policy "clubhouse reports insert"
on public.launch_clubhouse_reports
for insert
to authenticated
with check (
  private.clubhouse_can_access(season_id, team_id)
  and reporter_profile_id = private.current_launch_profile_id()
  and reporter_profile_id <> content_author_profile_id
);

drop policy if exists "clubhouse reports admins select" on public.launch_clubhouse_reports;
create policy "clubhouse reports admins select"
on public.launch_clubhouse_reports
for select
to authenticated
using (private.clubhouse_is_team_admin(season_id, team_id));

drop policy if exists "clubhouse reports admins update" on public.launch_clubhouse_reports;
create policy "clubhouse reports admins update"
on public.launch_clubhouse_reports
for update
to authenticated
using (private.clubhouse_is_team_admin(season_id, team_id))
with check (private.clubhouse_is_team_admin(season_id, team_id));

grant select, insert, update on public.launch_clubhouse_reports to authenticated;

comment on table public.launch_clubhouse_reports is
  'Private reports of Clubhouse social content. Visible only to the affected team admins and commissioners.';
