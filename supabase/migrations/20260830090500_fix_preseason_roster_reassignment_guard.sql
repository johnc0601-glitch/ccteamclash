-- Allow the existing captain/commissioner roster RPCs to reuse a player's
-- permanent season-membership row before roster rules lock, while keeping
-- identity and post-lock protections intact.

create or replace function private.validate_launch_season_roster_membership()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  rules_locked boolean;
begin
  if tg_op = 'DELETE' then
    raise exception 'Season roster memberships cannot be deleted.' using errcode = '42501';
  end if;

  -- A player must be active to join/rejoin a roster. Dropping an already
  -- inactive player is still permitted so stale memberships can be closed.
  if new.status = 'Active' and not exists (
    select 1
    from public.launch_players player
    where player.id = new.player_id
      and player.active = true
  ) then
    raise exception 'Season roster player must be active.' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
      or new.season_id is distinct from old.season_id
      or new.player_id is distinct from old.player_id
      or new.created_at is distinct from old.created_at
    then
      raise exception 'Season roster membership identity fields cannot be changed.' using errcode = '23514';
    end if;

    rules_locked := private.is_launch_season_roster_rules_locked(old.season_id, pg_catalog.clock_timestamp());

    if old.status = 'Dropped' and new.status is distinct from old.status and rules_locked then
      raise exception 'Dropped season roster members cannot be reactivated after roster lock.' using errcode = '42501';
    end if;

    if (
      new.team_id is distinct from old.team_id
      or new.roster_category is distinct from old.roster_category
      or new.added_by is distinct from old.added_by
      or new.added_at is distinct from old.added_at
    ) and rules_locked then
      raise exception 'Season roster membership assignment is locked.' using errcode = '42501';
    end if;

    if new.status = old.status and (
      new.dropped_by is distinct from old.dropped_by
      or new.dropped_at is distinct from old.dropped_at
    ) then
      raise exception 'Season roster membership drop audit fields are database-managed.' using errcode = '42501';
    end if;

    new.updated_at := pg_catalog.clock_timestamp();
  end if;

  return new;
end;
$function$;
