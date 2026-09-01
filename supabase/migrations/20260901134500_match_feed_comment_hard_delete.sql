-- Matchday comment hard delete
-- Commissioner removals should leave no public tombstone or dependent activity.

create or replace function private.hard_delete_removed_match_feed_comment()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if new.deleted_at is not null then
    delete from public.launch_match_feed_comments
    where id = new.id;
    return null;
  end if;

  return new;
end;
$$;

drop trigger if exists hard_delete_removed_match_feed_comment_trigger
  on public.launch_match_feed_comments;

create trigger hard_delete_removed_match_feed_comment_trigger
after update of deleted_at
on public.launch_match_feed_comments
for each row
when (new.deleted_at is not null)
execute function private.hard_delete_removed_match_feed_comment();

-- Remove any historical comment tombstones. Child replies, reactions, and
-- moderation reports cascade through their foreign keys.
delete from public.launch_match_feed_comments
where deleted_at is not null;
