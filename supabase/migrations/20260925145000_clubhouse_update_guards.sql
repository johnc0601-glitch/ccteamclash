-- Enforce author-edit vs moderator-action boundaries for Clubhouse content.
-- RLS grants moderators UPDATE so they can pin/soft-remove; these guards prevent
-- that permission from being used to rewrite another member's text.

create or replace function private.clubhouse_guard_post_update()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_profile_id text := private.current_launch_profile_id();
  actor_is_author boolean := actor_profile_id is not null and actor_profile_id = old.author_profile_id;
  actor_is_admin boolean := private.clubhouse_is_team_admin(old.season_id, old.team_id);
begin
  if old.deleted_at is not null then
    raise exception 'Deleted Clubhouse posts cannot be modified.' using errcode = '42501';
  end if;

  if new.id is distinct from old.id
     or new.season_id is distinct from old.season_id
     or new.team_id is distinct from old.team_id
     or new.author_profile_id is distinct from old.author_profile_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Clubhouse post identity fields cannot be changed.' using errcode = '42501';
  end if;

  if new.deleted_at is distinct from old.deleted_at
     and not (old.deleted_at is null and new.deleted_at is not null) then
    raise exception 'Clubhouse posts cannot be restored through update.' using errcode = '42501';
  end if;

  if actor_is_author then
    new.updated_at := now();
    return new;
  end if;

  if not actor_is_admin then
    raise exception 'Clubhouse post update is not allowed.' using errcode = '42501';
  end if;

  if new.title is distinct from old.title
     or new.body is distinct from old.body
     or new.post_type is distinct from old.post_type then
    raise exception 'Moderators may pin or remove posts, but may not edit member content.' using errcode = '42501';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists clubhouse_guard_post_update on public.launch_clubhouse_posts;
create trigger clubhouse_guard_post_update
before update on public.launch_clubhouse_posts
for each row execute function private.clubhouse_guard_post_update();

create or replace function private.clubhouse_guard_comment_update()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  actor_profile_id text := private.current_launch_profile_id();
  actor_is_author boolean := actor_profile_id is not null and actor_profile_id = old.author_profile_id;
  target_season_id text;
  target_team_id text;
  actor_is_admin boolean := false;
begin
  if old.deleted_at is not null then
    raise exception 'Deleted Clubhouse comments cannot be modified.' using errcode = '42501';
  end if;

  if new.id is distinct from old.id
     or new.post_id is distinct from old.post_id
     or new.author_profile_id is distinct from old.author_profile_id
     or new.parent_comment_id is distinct from old.parent_comment_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Clubhouse comment identity fields cannot be changed.' using errcode = '42501';
  end if;

  if new.deleted_at is distinct from old.deleted_at
     and not (old.deleted_at is null and new.deleted_at is not null) then
    raise exception 'Clubhouse comments cannot be restored through update.' using errcode = '42501';
  end if;

  if actor_is_author then
    new.updated_at := now();
    return new;
  end if;

  select post.season_id, post.team_id
    into target_season_id, target_team_id
  from public.launch_clubhouse_posts post
  where post.id = old.post_id;

  actor_is_admin := target_season_id is not null
    and target_team_id is not null
    and private.clubhouse_is_team_admin(target_season_id, target_team_id);

  if not actor_is_admin then
    raise exception 'Clubhouse comment update is not allowed.' using errcode = '42501';
  end if;

  if new.body is distinct from old.body then
    raise exception 'Moderators may remove comments, but may not edit member content.' using errcode = '42501';
  end if;

  if new.deleted_at is not distinct from old.deleted_at then
    raise exception 'Moderator comment updates are limited to removal.' using errcode = '42501';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists clubhouse_guard_comment_update on public.launch_clubhouse_comments;
create trigger clubhouse_guard_comment_update
before update on public.launch_clubhouse_comments
for each row execute function private.clubhouse_guard_comment_update();

comment on function private.clubhouse_guard_post_update() is
  'Authors may edit their own Clubhouse posts. Team admins may pin or soft-remove but cannot rewrite another author content.';
comment on function private.clubhouse_guard_comment_update() is
  'Authors may edit their own Clubhouse comments. Team admins may soft-remove but cannot rewrite another author content.';