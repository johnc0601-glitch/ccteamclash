-- Story Comments V1 advisor fixes: cover composite FKs and consolidate overlapping authenticated policies.

create index if not exists launch_story_comments_parent_story_idx
  on public.launch_story_comments(parent_comment_id, story_id)
  where parent_comment_id is not null;

create index if not exists launch_story_comments_deleted_by_idx
  on public.launch_story_comments(deleted_by)
  where deleted_by is not null;

create index if not exists launch_story_comment_reports_comment_story_idx
  on public.launch_story_comment_reports(comment_id, story_id);

drop policy if exists "public reads published story comments" on public.launch_story_comments;
drop policy if exists "commissioners read all story comments" on public.launch_story_comments;

drop policy if exists "anon reads published story comments" on public.launch_story_comments;
create policy "anon reads published story comments"
  on public.launch_story_comments
  for select
  to anon
  using (
    exists (
      select 1
      from public.launch_stories story
      where story.id = launch_story_comments.story_id
        and story.status = 'published'
    )
  );

drop policy if exists "authenticated reads story comments" on public.launch_story_comments;
create policy "authenticated reads story comments"
  on public.launch_story_comments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.launch_stories story
      where story.id = launch_story_comments.story_id
        and story.status = 'published'
    )
    or (select private.is_launch_commissioner())
  );

drop policy if exists "authors edit published story comments" on public.launch_story_comments;
drop policy if exists "commissioners moderate story comments" on public.launch_story_comments;

drop policy if exists "authors or commissioners update story comments" on public.launch_story_comments;
create policy "authors or commissioners update story comments"
  on public.launch_story_comments
  for update
  to authenticated
  using (
    (
      profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
      and deleted_at is null
      and exists (
        select 1
        from public.launch_stories story
        where story.id = launch_story_comments.story_id
          and story.status = 'published'
      )
    )
    or (select private.is_launch_commissioner())
  )
  with check (
    (
      profile_id = (select id from public.launch_profiles where user_id = (select auth.uid()) limit 1)
      and exists (
        select 1
        from public.launch_stories story
        where story.id = launch_story_comments.story_id
          and story.status = 'published'
      )
    )
    or (select private.is_launch_commissioner())
  );

revoke all on function private.guard_launch_story_comment_identity() from public;
revoke all on function private.guard_launch_story_comment_identity() from anon;
revoke all on function private.guard_launch_story_comment_identity() from authenticated;
