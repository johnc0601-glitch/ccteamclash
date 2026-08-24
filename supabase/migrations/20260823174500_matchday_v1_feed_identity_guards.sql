create or replace function private.guard_launch_match_feed_post_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  trusted_author_name text;
  commissioner boolean;
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
    return new;
  end if;

  new.match_id := old.match_id;
  new.profile_id := old.profile_id;
  new.author_name_snapshot := old.author_name_snapshot;
  new.created_at := old.created_at;

  commissioner := coalesce((select private.is_launch_commissioner()), false);
  if not commissioner then
    new.image_path := old.image_path;
    new.deleted_at := old.deleted_at;
    new.deleted_by := old.deleted_by;
  end if;

  return new;
end;
$$;

create or replace function private.guard_launch_match_feed_comment_identity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  trusted_author_name text;
  commissioner boolean;
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
    return new;
  end if;

  new.post_id := old.post_id;
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

drop trigger if exists launch_match_feed_post_identity_guard on public.launch_match_feed_posts;
create trigger launch_match_feed_post_identity_guard
before insert or update on public.launch_match_feed_posts
for each row execute function private.guard_launch_match_feed_post_identity();

drop trigger if exists launch_match_feed_comment_identity_guard on public.launch_match_feed_comments;
create trigger launch_match_feed_comment_identity_guard
before insert or update on public.launch_match_feed_comments
for each row execute function private.guard_launch_match_feed_comment_identity();
