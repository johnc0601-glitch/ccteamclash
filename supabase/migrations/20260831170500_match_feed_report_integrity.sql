create or replace function private.validate_launch_match_feed_report_insert()
returns trigger
language plpgsql
security definer
set search_path = public, private
set row_security = off
as $$
declare
  target_profile_id text;
  target_match_id text;
  target_deleted_at timestamptz;
  parent_deleted_at timestamptz;
begin
  -- Review state is commissioner-owned. Member-created reports always begin pending.
  new.status := 'Pending';
  new.created_at := now();
  new.reviewed_at := null;
  new.reviewed_by_profile_id := null;
  new.resolution_note := '';

  if new.post_id is not null then
    select post.profile_id, post.match_id, post.deleted_at
      into target_profile_id, target_match_id, target_deleted_at
    from public.launch_match_feed_posts post
    where post.id = new.post_id;

    if not found or target_deleted_at is not null then
      raise exception using errcode = '23514', message = 'Reported post is not available.';
    end if;
  elsif new.comment_id is not null then
    select comment.profile_id, post.match_id, comment.deleted_at, post.deleted_at
      into target_profile_id, target_match_id, target_deleted_at, parent_deleted_at
    from public.launch_match_feed_comments comment
    join public.launch_match_feed_posts post on post.id = comment.post_id
    where comment.id = new.comment_id;

    if not found or target_deleted_at is not null or parent_deleted_at is not null then
      raise exception using errcode = '23514', message = 'Reported comment is not available.';
    end if;
  else
    raise exception using errcode = '23514', message = 'A report target is required.';
  end if;

  if target_match_id is distinct from new.match_id then
    raise exception using errcode = '23514', message = 'Reported content does not belong to this match.';
  end if;

  if target_profile_id = new.reporter_profile_id then
    raise exception using errcode = '23514', message = 'Members cannot report their own content.';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_launch_match_feed_report_insert() from public;

 drop trigger if exists launch_match_feed_reports_validate_insert on public.launch_match_feed_reports;
create trigger launch_match_feed_reports_validate_insert
before insert on public.launch_match_feed_reports
for each row execute function private.validate_launch_match_feed_report_insert();
