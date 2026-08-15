-- Preserve a reached lock before schedule mutations without replacing the
-- caller's UPDATE row with OLD. DELETE triggers must still return OLD.
create or replace function private.preserve_launch_season_roster_rules_before_schedule_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.persist_launch_season_roster_rules_lock(old.season_id);

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;
