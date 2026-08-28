-- Final lock hardening: a doubles side is either a complete two-player pair or
-- intentionally empty, and official rosters requiring review cannot feed an
-- authoritative matchup prediction.

create or replace function public.prevent_locked_match_structure_slot_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lock_id uuid;
  v_status text;
begin
  if tg_op = 'DELETE' then
    v_lock_id := old.structure_lock_id;
  else
    v_lock_id := new.structure_lock_id;
  end if;

  select status into v_status
  from public.launch_match_structure_locks
  where id = v_lock_id;

  if v_status = 'Locked' then
    raise exception 'Locked match structure cannot be changed.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create or replace function public.validate_match_structure_finalize()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot_count integer;
begin
  if old.status = 'Locked' and new.status <> 'Locked' then
    raise exception 'Locked match structure is immutable.';
  end if;

  if old.status = 'Locked' and (
    new.home_team_id is distinct from old.home_team_id
    or new.away_team_id is distinct from old.away_team_id
    or new.match_id is distinct from old.match_id
  ) then
    raise exception 'Locked match structure is immutable.';
  end if;

  if old.status <> 'Locked' and new.status = 'Locked' then
    select count(*) into v_slot_count
    from public.launch_match_structure_slots slot
    where slot.structure_lock_id = new.id;

    -- 18 Singles x 2 sides + 9 Doubles x 2 sides x 2 player slots.
    if v_slot_count <> 72 then
      raise exception 'Match structure must contain all 72 standard player slots before locking.';
    end if;

    if not exists (
      select 1 from public.launch_match_roster_snapshots roster
      where roster.match_id = new.match_id
        and roster.team_id = new.home_team_id
        and roster.needs_commissioner_review = false
    ) or not exists (
      select 1 from public.launch_match_roster_snapshots roster
      where roster.match_id = new.match_id
        and roster.team_id = new.away_team_id
        and roster.needs_commissioner_review = false
    ) then
      raise exception 'Both reviewed official roster snapshots are required before locking match structure.';
    end if;

    if exists (
      select 1
      from public.launch_match_structure_slots slot
      where slot.structure_lock_id = new.id
        and slot.format = 'Doubles'
      group by slot.position, slot.side
      having count(*) filter (where slot.player_id is not null) = 1
    ) then
      raise exception 'Each doubles side must contain two players or be intentionally empty.';
    end if;

    new.updated_at := now();
  end if;

  return new;
end;
$$;
