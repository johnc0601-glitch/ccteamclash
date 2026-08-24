create or replace function private.redact_removed_match_feed_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    new.body := 'Post removed';
    new.image_path := null;
  end if;
  return new;
end;
$$;

create or replace function private.redact_removed_match_feed_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.deleted_at is null and new.deleted_at is not null then
    new.body := 'Comment removed';
  end if;
  return new;
end;
$$;

drop trigger if exists launch_match_feed_post_redact_removed on public.launch_match_feed_posts;
create trigger launch_match_feed_post_redact_removed
before update on public.launch_match_feed_posts
for each row execute function private.redact_removed_match_feed_post();

drop trigger if exists launch_match_feed_comment_redact_removed on public.launch_match_feed_comments;
create trigger launch_match_feed_comment_redact_removed
before update on public.launch_match_feed_comments
for each row execute function private.redact_removed_match_feed_comment();

update public.launch_match_feed_posts
set body = 'Post removed'
where deleted_at is not null and body <> 'Post removed';

update public.launch_match_feed_comments
set body = 'Comment removed'
where deleted_at is not null and body <> 'Comment removed';
