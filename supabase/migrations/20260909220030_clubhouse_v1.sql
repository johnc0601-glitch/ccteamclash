-- Clubhouse v1: season-scoped private team posts, comments, reactions and RLS.
create table if not exists public.launch_clubhouse_posts (
  id uuid primary key default gen_random_uuid(),
  season_id text not null references public.launch_seasons(id) on delete cascade,
  team_id text not null references public.launch_teams(id) on delete cascade,
  author_profile_id text not null references public.launch_profiles(id) on delete restrict,
  title text,
  body text not null check (char_length(body) between 1 and 3000),
  pinned_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists launch_clubhouse_posts_context_idx on public.launch_clubhouse_posts(season_id, team_id, created_at desc);

create table if not exists public.launch_clubhouse_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.launch_clubhouse_posts(id) on delete cascade,
  author_profile_id text not null references public.launch_profiles(id) on delete restrict,
  parent_comment_id uuid references public.launch_clubhouse_comments(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists launch_clubhouse_comments_post_idx on public.launch_clubhouse_comments(post_id, created_at);

create table if not exists public.launch_clubhouse_post_reactions (
  post_id uuid not null references public.launch_clubhouse_posts(id) on delete cascade,
  profile_id text not null references public.launch_profiles(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('like','love','laugh','fire')),
  created_at timestamptz not null default now(),
  primary key (post_id, profile_id)
);

create or replace function private.clubhouse_can_access(target_season_id text, target_team_id text)
returns boolean language sql security definer stable set search_path = pg_catalog, public as $$
  select exists (
    select 1 from public.launch_profiles p
    where p.user_id = auth.uid() and p.status = 'Approved'
      and (p.role = 'Commissioner' or exists (
        select 1 from public.launch_season_roster_memberships m
        where m.season_id = target_season_id and m.team_id = target_team_id
          and m.player_id = p.player_id and m.status = 'Active'
      ))
  );
$$;

create or replace function private.clubhouse_is_team_admin(target_season_id text, target_team_id text)
returns boolean language sql security definer stable set search_path = pg_catalog, public as $$
  select exists (
    select 1 from public.launch_profiles p
    where p.user_id = auth.uid() and p.status = 'Approved'
      and (p.role = 'Commissioner' or (
        p.role = 'Captain' and p.captain_team_id = target_team_id and exists (
          select 1 from public.launch_season_roster_memberships m
          where m.season_id = target_season_id and m.team_id = target_team_id
            and m.player_id = p.player_id and m.status = 'Active'
        )
      ))
  );
$$;

create or replace function private.clubhouse_validate_post_pin()
returns trigger language plpgsql security definer set search_path = pg_catalog, public as $$
begin
  if new.pinned_at is distinct from old.pinned_at and not private.clubhouse_is_team_admin(new.season_id, new.team_id) then
    raise exception 'Only team captains or commissioners can pin Clubhouse posts.';
  end if;
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists clubhouse_validate_post_pin on public.launch_clubhouse_posts;
create trigger clubhouse_validate_post_pin before update on public.launch_clubhouse_posts for each row execute function private.clubhouse_validate_post_pin();

alter table public.launch_clubhouse_posts enable row level security;
alter table public.launch_clubhouse_comments enable row level security;
alter table public.launch_clubhouse_post_reactions enable row level security;

create policy "clubhouse posts select" on public.launch_clubhouse_posts for select to authenticated using (private.clubhouse_can_access(season_id, team_id));
create policy "clubhouse posts insert" on public.launch_clubhouse_posts for insert to authenticated with check (private.clubhouse_can_access(season_id, team_id) and exists (select 1 from public.launch_profiles p where p.id=author_profile_id and p.user_id=auth.uid() and p.status='Approved'));
create policy "clubhouse posts update" on public.launch_clubhouse_posts for update to authenticated using (private.clubhouse_can_access(season_id,team_id) and (private.clubhouse_is_team_admin(season_id,team_id) or exists (select 1 from public.launch_profiles p where p.id=author_profile_id and p.user_id=auth.uid()))) with check (private.clubhouse_can_access(season_id,team_id));
create policy "clubhouse posts delete" on public.launch_clubhouse_posts for delete to authenticated using (private.clubhouse_is_team_admin(season_id,team_id) or exists (select 1 from public.launch_profiles p where p.id=author_profile_id and p.user_id=auth.uid()));
create policy "clubhouse comments select" on public.launch_clubhouse_comments for select to authenticated using (exists (select 1 from public.launch_clubhouse_posts p where p.id=post_id and private.clubhouse_can_access(p.season_id,p.team_id)));
create policy "clubhouse comments insert" on public.launch_clubhouse_comments for insert to authenticated with check (exists (select 1 from public.launch_clubhouse_posts p where p.id=post_id and private.clubhouse_can_access(p.season_id,p.team_id)) and exists (select 1 from public.launch_profiles p where p.id=author_profile_id and p.user_id=auth.uid() and p.status='Approved'));
create policy "clubhouse comments update" on public.launch_clubhouse_comments for update to authenticated using (exists (select 1 from public.launch_profiles p where p.id=author_profile_id and p.user_id=auth.uid())) with check (exists (select 1 from public.launch_clubhouse_posts p where p.id=post_id and private.clubhouse_can_access(p.season_id,p.team_id)));
create policy "clubhouse comments delete" on public.launch_clubhouse_comments for delete to authenticated using (exists (select 1 from public.launch_profiles p where p.id=author_profile_id and p.user_id=auth.uid()) or exists (select 1 from public.launch_clubhouse_posts post where post.id=post_id and private.clubhouse_is_team_admin(post.season_id,post.team_id)));
create policy "clubhouse reactions select" on public.launch_clubhouse_post_reactions for select to authenticated using (exists (select 1 from public.launch_clubhouse_posts p where p.id=post_id and private.clubhouse_can_access(p.season_id,p.team_id)));
create policy "clubhouse reactions insert" on public.launch_clubhouse_post_reactions for insert to authenticated with check (exists (select 1 from public.launch_clubhouse_posts p where p.id=post_id and private.clubhouse_can_access(p.season_id,p.team_id)) and exists (select 1 from public.launch_profiles p where p.id=profile_id and p.user_id=auth.uid() and p.status='Approved'));
create policy "clubhouse reactions update" on public.launch_clubhouse_post_reactions for update to authenticated using (exists (select 1 from public.launch_profiles p where p.id=profile_id and p.user_id=auth.uid())) with check (exists (select 1 from public.launch_profiles p where p.id=profile_id and p.user_id=auth.uid()));
create policy "clubhouse reactions delete" on public.launch_clubhouse_post_reactions for delete to authenticated using (exists (select 1 from public.launch_profiles p where p.id=profile_id and p.user_id=auth.uid()));

grant select,insert,update,delete on public.launch_clubhouse_posts to authenticated;
grant select,insert,update,delete on public.launch_clubhouse_comments to authenticated;
grant select,insert,update,delete on public.launch_clubhouse_post_reactions to authenticated;
grant execute on function private.clubhouse_can_access(text,text) to authenticated;
grant execute on function private.clubhouse_is_team_admin(text,text) to authenticated;
