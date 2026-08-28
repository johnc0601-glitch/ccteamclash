-- Harden the staged match-structure lock with schedule identity validation and
-- one atomic service-role finalization function.

create or replace function public.validate_match_structure_schedule()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_home_team_id text;
  v_away_team_id text;
begin
  select match.home_team_id, match.away_team_id
  into v_home_team_id, v_away_team_id
  from public.launch_schedule_matches match
  where match.id = new.match_id;

  if v_home_team_id is null or v_away_team_id is null then
    raise exception 'Scheduled match not found for structure lock.';
  end if;

  if new.home_team_id <> v_home_team_id or new.away_team_id <> v_away_team_id then
    raise exception 'Match structure teams do not match the scheduled home and away teams.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_match_structure_schedule_trigger
  on public.launch_match_structure_locks;
create trigger validate_match_structure_schedule_trigger
before insert or update of match_id, home_team_id, away_team_id
on public.launch_match_structure_locks
for each row execute function public.validate_match_structure_schedule();

create or replace function public.save_locked_match_structure(
  p_match_id text,
  p_home_team_id text,
  p_away_team_id text,
  p_locked_by text,
  p_locked_at timestamptz,
  p_slots jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lock_id uuid;
  v_existing_status text;
begin
  if auth.role() <> 'service_role' then
    raise exception 'Match structure finalization requires service role.';
  end if;

  if nullif(btrim(p_match_id), '') is null
    or nullif(btrim(p_home_team_id), '') is null
    or nullif(btrim(p_away_team_id), '') is null
    or nullif(btrim(p_locked_by), '') is null
    or p_locked_at is null then
    raise exception 'Match structure lock identity and timestamp are required.';
  end if;

  if jsonb_typeof(p_slots) <> 'array' or jsonb_array_length(p_slots) <> 72 then
    raise exception 'Match structure requires exactly 72 standard player slots.';
  end if;

  select status into v_existing_status
  from public.launch_match_structure_locks
  where match_id = p_match_id
  for update;

  if v_existing_status = 'Locked' then
    raise exception 'Match structure is already locked.';
  end if;

  if v_existing_status = 'Draft' then
    delete from public.launch_match_structure_locks where match_id = p_match_id;
  end if;

  insert into public.launch_match_structure_locks (
    match_id,
    home_team_id,
    away_team_id,
    status,
    created_at,
    updated_at
  ) values (
    p_match_id,
    p_home_team_id,
    p_away_team_id,
    'Draft',
    now(),
    now()
  ) returning id into v_lock_id;

  insert into public.launch_match_structure_slots (
    structure_lock_id,
    format,
    position,
    side,
    player_slot,
    player_id
  )
  select
    v_lock_id,
    slot.format,
    slot.position,
    slot.side,
    slot.player_slot,
    nullif(btrim(slot.player_id), '')
  from jsonb_to_recordset(p_slots) as slot(
    format text,
    position integer,
    side text,
    player_slot integer,
    player_id text
  );

  update public.launch_match_structure_locks
  set
    status = 'Locked',
    locked_by = p_locked_by,
    locked_at = p_locked_at,
    updated_at = now()
  where id = v_lock_id;

  return v_lock_id;
end;
$$;

revoke all on function public.save_locked_match_structure(text, text, text, text, timestamptz, jsonb)
  from public, anon, authenticated;
grant execute on function public.save_locked_match_structure(text, text, text, text, timestamptz, jsonb)
  to service_role;

comment on function public.save_locked_match_structure(text, text, text, text, timestamptz, jsonb) is
  'Atomically stores all 72 pre-match structure slots and transitions the structure to immutable Locked state.';
