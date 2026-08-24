alter table if exists public.launch_match_feed_posts add column if not exists edited_at timestamptz;
alter table if exists public.launch_match_feed_posts add column if not exists author_name_snapshot text;
alter table if exists public.launch_match_feed_comments add column if not exists edited_at timestamptz;
alter table if exists public.launch_match_feed_comments add column if not exists author_name_snapshot text;

update public.launch_match_feed_posts p
set author_name_snapshot = coalesce(nullif(btrim(pr.display_name), ''), 'Member')
from public.launch_profiles pr
where pr.id = p.profile_id and p.author_name_snapshot is null;

update public.launch_match_feed_comments c
set author_name_snapshot = coalesce(nullif(btrim(pr.display_name), ''), 'Member')
from public.launch_profiles pr
where pr.id = c.profile_id and c.author_name_snapshot is null;

alter table public.launch_match_feed_posts alter column author_name_snapshot set default 'Member';
alter table public.launch_match_feed_comments alter column author_name_snapshot set default 'Member';

revoke insert, update, delete on public.launch_match_feed_posts from authenticated;
revoke insert, update, delete on public.launch_match_feed_comments from authenticated;
revoke insert, update, delete on public.launch_match_feed_post_reactions from authenticated;
revoke insert, update, delete on public.launch_match_feed_comment_reactions from authenticated;
grant select on public.launch_match_feed_posts to anon, authenticated;
grant select on public.launch_match_feed_comments to anon, authenticated;
grant select on public.launch_match_feed_post_reactions to anon, authenticated;
grant select on public.launch_match_feed_comment_reactions to anon, authenticated;

drop policy if exists "commissioners manage match feed posts" on public.launch_match_feed_posts;
drop policy if exists "commissioners manage match feed comments" on public.launch_match_feed_comments;
drop policy if exists "commissioners manage match feed post reactions" on public.launch_match_feed_post_reactions;
drop policy if exists "commissioners manage match feed comment reactions" on public.launch_match_feed_comment_reactions;
drop policy if exists "public reads match feed posts" on public.launch_match_feed_posts;
drop policy if exists "public reads match feed comments" on public.launch_match_feed_comments;
drop policy if exists "public reads match feed post reactions" on public.launch_match_feed_post_reactions;
drop policy if exists "public reads match feed comment reactions" on public.launch_match_feed_comment_reactions;

create policy "public reads match feed posts" on public.launch_match_feed_posts for select to anon, authenticated using (true);
create policy "public reads match feed comments" on public.launch_match_feed_comments for select to anon, authenticated using (true);
create policy "public reads match feed post reactions" on public.launch_match_feed_post_reactions for select to anon, authenticated using (true);
create policy "public reads match feed comment reactions" on public.launch_match_feed_comment_reactions for select to anon, authenticated using (true);

update storage.buckets set public = true where id = 'match-feed';
drop policy if exists "commissioners read match feed images" on storage.objects;
drop policy if exists "commissioners upload match feed images" on storage.objects;
drop policy if exists "commissioners update match feed images" on storage.objects;
drop policy if exists "commissioners delete match feed images" on storage.objects;

create table if not exists public.launch_match_roster_unlocks (
  id uuid primary key default gen_random_uuid(),
  match_id text not null references public.launch_schedule_matches(id) on delete cascade,
  team_id text not null references public.launch_teams(id) on delete cascade,
  unlocked_by text not null references public.launch_profiles(id) on delete restrict,
  unlocked_at timestamptz not null default now(),
  relocked_at timestamptz,
  relocked_by text references public.launch_profiles(id) on delete set null,
  constraint launch_match_roster_unlocks_one_open unique nulls not distinct (match_id, team_id, relocked_at)
);
create index if not exists launch_match_roster_unlocks_open_idx on public.launch_match_roster_unlocks(match_id, team_id) where relocked_at is null;
alter table public.launch_match_roster_unlocks enable row level security;
revoke all on public.launch_match_roster_unlocks from anon, authenticated;
