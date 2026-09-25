-- Distinguish authoritative captain announcements from normal Clubhouse discussion.

alter table public.launch_clubhouse_posts
  add column if not exists post_type text not null default 'discussion'
  check (post_type in ('discussion','announcement'));

create or replace function private.clubhouse_validate_post_type()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
begin
  if new.post_type = 'announcement'
     and not private.clubhouse_is_team_admin(new.season_id, new.team_id) then
    raise exception 'Only team captains or commissioners can publish Clubhouse announcements.'
      using errcode = '42501';
  end if;

  if tg_op = 'UPDATE'
     and new.post_type is distinct from old.post_type
     and not private.clubhouse_is_team_admin(new.season_id, new.team_id) then
    raise exception 'Only team captains or commissioners can change announcement status.'
      using errcode = '42501';
  end if;

  if new.post_type = 'announcement' and new.pinned_at is null then
    new.pinned_at = now();
  end if;

  return new;
end;
$$;

drop trigger if exists clubhouse_validate_post_type on public.launch_clubhouse_posts;
create trigger clubhouse_validate_post_type
before insert or update of post_type
on public.launch_clubhouse_posts
for each row execute function private.clubhouse_validate_post_type();

create index if not exists launch_clubhouse_posts_announcement_idx
  on public.launch_clubhouse_posts(season_id, team_id, created_at desc)
  where post_type='announcement' and deleted_at is null;

comment on column public.launch_clubhouse_posts.post_type is
  'discussion for normal team conversation; announcement for captain/commissioner team notices.';
