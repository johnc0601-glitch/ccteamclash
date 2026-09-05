-- Story Comments V1: discussion, replies, reactions, reporting, and commissioner moderation for published stories.

create table if not exists public.launch_story_comments (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.launch_stories(id) on update cascade on delete cascade,
  profile_id text not null references public.launch_profiles(id) on update cascade on delete restrict,
  author_name_snapshot text not null default 'Member',
  parent_comment_id uuid,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  edited_at timestamptz,
  deleted_at timestamptz,
  deleted_by text references public.launch_profiles(id) on update cascade on delete set null,
  constraint launch_story_comments_body_check check (char_length(btrim(body)) between 1 and 1500),
  constraint launch_story_comments_identity_unique unique (id, story_id),
  constraint launch_story_comments_parent_fk foreign key (parent_comment_id, story_id)
    references public.launch_story_comments(id, story_id) on update cascade on delete cascade,
  constraint launch_story_comments_parent_not_self check (parent_comment_id is null or parent_comment_id <> id)
);

create index if not exists launch_story_comments_story_created_idx
  on public.launch_story_comments(story_id, created_at asc);
create index if not exists launch_story_comments_profile_created_idx
  on public.launch_story_comments(profile_id, created_at desc);
create index if not exists launch_story_comments_parent_idx
  on public.launch_story_comments(parent_comment_id) where parent_comment_id is not null;

create table if not exists public.launch_story_comment_reactions (
  comment_id uuid not null references public.launch_story_comments(id) on update cascade on delete cascade,
  profile_id text not null references public.launch_profiles(id) on update cascade on delete cascade,
  reaction_type text not null,
  created_at timestamptz not null default now(),
  primary key (comment_id, profile_id),
  constraint launch_story_comment_reactions_type_check check (reaction_type in ('like','love','laugh','fire'))
);

create index if not exists launch_story_comment_reactions_profile_idx
  on public.launch_story_comment_reactions(profile_id);

create table if not exists public.launch_story_comment_reports (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null,
  comment_id uuid not null,
  reporter_profile_id text not null references public.launch_profiles(id) on update cascade on delete cascade,
  reason text not null,
  note text not null default '',
  status text not null default 'Pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by_profile_id text references public.launch_profiles(id) on update cascade on delete set null,
  resolution_note text not null default '',
  constraint launch_story_comment_reports_comment_fk foreign key (comment_id, story_id)
    references public.launch_story_comments(id, story_id) on update cascade on delete cascade,
  constraint launch_story_comment_reports_reason_check check (reason in ('Spam','Harassment','Inappropriate','Other')),
  constraint launch_story_comment_reports_status_check check (status in ('Pending','Resolved','Dismissed')),
  constraint launch_story_comment_reports_note_check check (char_length(note) <= 500),
  constraint launch_story_comment_reports_resolution_note_check check (char_length(resolution_note) <= 500),
  constraint launch_story_comment_reports_reporter_unique unique (reporter_profile_id, comment_id)
);

create index if not exists launch_story_comment_reports_status_created_idx
  on public.launch_story_comment_reports(status, created_at desc);
create index if not exists launch_story_comment_reports_story_idx
  on public.launch_story_comment_reports(story_id, created_at desc);
create index if not exists launch_story_comment_reports_reviewer_idx
  on public.launch_story_comment_reports(reviewed_by_profile_id) where reviewed_by_profile_id is not null;

alter table public.launch_story_comments enable row level security;
alter table public.launch_story_comment_reactions enable row level security;
alter table public.launch_story_comment_reports enable row level security;

revoke all on table public.launch_story_comments from anon, authenticated;
revoke all on table public.launch_story_comment_reactions from anon, authenticated;
revoke all on table public.launch_story_comment_reports from anon, authenticated;

grant select on table public.launch_story_comments to anon;
grant select, insert, update on table public.launch_story_comments to authenticated;
grant select on table public.launch_story_comment_reactions to anon;
grant select, insert, update, delete on table public.launch_story_comment_reactions to authenticated;
grant select, insert, update on table public.launch_story_comment_reports to authenticated;

drop policy if exists "public reads published story comments" on public.launch_story_comments;
create policy "public reads published story comments"
  on public.launch_story_comments
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.launch_stories story
      where story.id = launch_story_comments.story_id
        and story.status = 'published'
    )
  );

drop policy if exists "commissioners read all story comments" on public.launch_story_comments;
create policy "commissioners read all story comments"
  on public.launch_story_comments
  for select
  to authenticated
  using ((select private.is_launch_commissioner()));

drop policy if exists "members create published story comments" on public.launch_story_comments;
create policy "members create published story comments"
  on public.launch_story_comments
  for insert
  to authenticated
  with check (
    profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
    and deleted_at is null
    and deleted_by is null
    and exists (
      select 1
      from public.launch_stories story
      where story.id = launch_story_comments.story_id
        and story.status = 'published'
    )
  );

drop policy if exists "authors edit published story comments" on public.launch_story_comments;
create policy "authors edit published story comments"
  on public.launch_story_comments
  for update
  to authenticated
  using (
    profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
    and deleted_at is null
    and exists (
      select 1
      from public.launch_stories story
      where story.id = launch_story_comments.story_id
        and story.status = 'published'
    )
  )
  with check (
    profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
    and exists (
      select 1
      from public.launch_stories story
      where story.id = launch_story_comments.story_id
        and story.status = 'published'
    )
  );

drop policy if exists "commissioners moderate story comments" on public.launch_story_comments;
create policy "commissioners moderate story comments"
  on public.launch_story_comments
  for update
  to authenticated
  using ((select private.is_launch_commissioner()))
  with check ((select private.is_launch_commissioner()));

drop policy if exists "public reads published story comment reactions" on public.launch_story_comment_reactions;
create policy "public reads published story comment reactions"
  on public.launch_story_comment_reactions
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.launch_story_comments comment
      join public.launch_stories story on story.id = comment.story_id
      where comment.id = launch_story_comment_reactions.comment_id
        and comment.deleted_at is null
        and story.status = 'published'
    )
  );

drop policy if exists "members insert own story comment reactions" on public.launch_story_comment_reactions;
create policy "members insert own story comment reactions"
  on public.launch_story_comment_reactions
  for insert
  to authenticated
  with check (
    profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
    and exists (
      select 1
      from public.launch_story_comments comment
      join public.launch_stories story on story.id = comment.story_id
      where comment.id = launch_story_comment_reactions.comment_id
        and comment.deleted_at is null
        and story.status = 'published'
    )
  );

drop policy if exists "members update own story comment reactions" on public.launch_story_comment_reactions;
create policy "members update own story comment reactions"
  on public.launch_story_comment_reactions
  for update
  to authenticated
  using (profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1))
  with check (
    profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
    and exists (
      select 1
      from public.launch_story_comments comment
      join public.launch_stories story on story.id = comment.story_id
      where comment.id = launch_story_comment_reactions.comment_id
        and comment.deleted_at is null
        and story.status = 'published'
    )
  );

drop policy if exists "members delete own story comment reactions" on public.launch_story_comment_reactions;
create policy "members delete own story comment reactions"
  on public.launch_story_comment_reactions
  for delete
  to authenticated
  using (profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1));

drop policy if exists "reporters and commissioners read story reports" on public.launch_story_comment_reports;
create policy "reporters and commissioners read story reports"
  on public.launch_story_comment_reports
  for select
  to authenticated
  using (
    reporter_profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
    or (select private.is_launch_commissioner())
  );

drop policy if exists "members report story comments" on public.launch_story_comment_reports;
create policy "members report story comments"
  on public.launch_story_comment_reports
  for insert
  to authenticated
  with check (
    reporter_profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
    and status = 'Pending'
    and reviewed_at is null
    and reviewed_by_profile_id is null
    and exists (
      select 1
      from public.launch_story_comments comment
      join public.launch_stories story on story.id = comment.story_id
      where comment.id = launch_story_comment_reports.comment_id
        and comment.story_id = launch_story_comment_reports.story_id
        and comment.deleted_at is null
        and comment.profile_id <> launch_story_comment_reports.reporter_profile_id
        and story.status = 'published'
    )
  );

drop policy if exists "commissioners review story reports" on public.launch_story_comment_reports;
create policy "commissioners review story reports"
  on public.launch_story_comment_reports
  for update
  to authenticated
  using ((select private.is_launch_commissioner()))
  with check ((select private.is_launch_commissioner()));

create or replace function private.guard_launch_story_comment_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  trusted_author_name text;
  commissioner boolean;
  parent_parent_id uuid;
  parent_deleted_at timestamptz;
begin
  if tg_op = 'INSERT' then
    select nullif(btrim(profile.display_name), '')
      into trusted_author_name
    from public.launch_profiles profile
    where profile.id = new.profile_id;

    if trusted_author_name is null then
      trusted_author_name := 'Member';
    end if;
    new.author_name_snapshot := trusted_author_name;

    if new.parent_comment_id is not null then
      select parent.parent_comment_id, parent.deleted_at
        into parent_parent_id, parent_deleted_at
      from public.launch_story_comments parent
      where parent.id = new.parent_comment_id
        and parent.story_id = new.story_id;

      if not found or parent_parent_id is not null or parent_deleted_at is not null then
        raise exception using errcode = '23514', message = 'That story comment cannot be replied to.';
      end if;
    end if;

    return new;
  end if;

  new.story_id := old.story_id;
  new.profile_id := old.profile_id;
  new.author_name_snapshot := old.author_name_snapshot;
  new.parent_comment_id := old.parent_comment_id;
  new.created_at := old.created_at;

  commissioner := coalesce((select private.is_launch_commissioner()), false);
  if not commissioner then
    new.deleted_at := old.deleted_at;
    new.deleted_by := old.deleted_by;
  end if;

  return new;
end;
$$;

drop trigger if exists launch_story_comment_identity_guard on public.launch_story_comments;
create trigger launch_story_comment_identity_guard
before insert or update on public.launch_story_comments
for each row execute function private.guard_launch_story_comment_identity();

comment on table public.launch_story_comments is 'Member comments and one-level replies attached directly to published stories.';
comment on table public.launch_story_comment_reactions is 'One reaction per member per story comment.';
comment on table public.launch_story_comment_reports is 'Member reports of story comments for commissioner review.';
