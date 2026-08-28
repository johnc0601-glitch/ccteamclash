-- Immutable pre-match Singles/Doubles structure for Team Strength V1.
--
-- The official roster snapshot answers who is eligible to play. This structure
-- lock records the actual format slots and pairings. Empty locked slots are
-- preserved deliberately so structural scoring can distinguish a true missing
-- slot from an unfinished result editor.

create table if not exists public.launch_match_structure_locks (
  id uuid primary key default gen_random_uuid(),
  match_id text not null unique references public.launch_schedule_matches(id) on delete cascade,
  home_team_id text not null references public.launch_teams(id) on delete restrict,
  away_team_id text not null references public.launch_teams(id) on delete restrict,
  status text not null default 'Draft' check (status in ('Draft', 'Locked')),
  locked_by text,
  locked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint launch_match_structure_distinct_teams check (home_team_id <> away_team_id),
  constraint launch_match_structure_lock_state check (
    (status = 'Draft' and locked_by is null and locked_at is null)
    or (status = 'Locked' and nullif(btrim(locked_by), '') is not null and locked_at is not null)
  )
);

create table if not exists public.launch_match_structure_slots (
  id bigint generated always as identity primary key,
  structure_lock_id uuid not null references public.launch_match_structure_locks(id) on delete cascade,
  format text not null check (format in ('Singles', 'Doubles')),
  position integer not null,
  side text not null check (side in ('Home', 'Away')),
  player_slot integer not null,
  player_id text references public.launch_players(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint launch_match_structure_slot_shape check (
    (format = 'Singles' and position between 1 and 18 and player_slot = 1)
    or (format = 'Doubles' and position between 1 and 9 and player_slot between 1 and 2)
  ),
  constraint launch_match_structure_slot_unique
    unique (structure_lock_id, format, position, side, player_slot)
);

-- A player may appear once in Singles and once in Doubles, but never twice in
-- the same format on the same side.
create unique index if not exists launch_match_structure_player_format_unique
  on public.launch_match_structure_slots(structure_lock_id, format, side, player_id)
  where player_id is not null;

create index if not exists launch_match_structure_slots_lock_idx
  on public.launch_match_structure_slots(structure_lock_id, format, position, side, player_slot);

create or replace function public.validate_match_structure_slot_roster()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_match_id text;
  v_team_id text;
  v_status text;
begin
  select
    structure.match_id,
    case when new.side = 'Home' then structure.home_team_id else structure.away_team_id end,
    structure.status
  into v_match_id, v_team_id, v_status
  from public.launch_match_structure_locks structure
  where structure.id = new.structure_lock_id;

  if v_match_id is null then
    raise exception 'Match structure lock not found.';
  end if;

  if v_status = 'Locked' then
    raise exception 'Locked match structure cannot be changed.';
  end if;

  if new.player_id is not null and not exists (
    select 1
    from public.launch_match_roster_snapshot_players snapshot_player
    where snapshot_player.match_id = v_match_id
      and snapshot_player.team_id = v_team_id
      and snapshot_player.player_id = new.player_id
  ) then
    raise exception 'Match structure player is not on the official roster snapshot.';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

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
  v_lock_id := coalesce(new.structure_lock_id, old.structure_lock_id);
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
      where roster.match_id = new.match_id and roster.team_id = new.home_team_id
    ) or not exists (
      select 1 from public.launch_match_roster_snapshots roster
      where roster.match_id = new.match_id and roster.team_id = new.away_team_id
    ) then
      raise exception 'Both official roster snapshots are required before locking match structure.';
    end if;

    new.updated_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists validate_match_structure_slot_roster_trigger
  on public.launch_match_structure_slots;
create trigger validate_match_structure_slot_roster_trigger
before insert or update on public.launch_match_structure_slots
for each row execute function public.validate_match_structure_slot_roster();

drop trigger if exists prevent_locked_match_structure_slot_delete_trigger
  on public.launch_match_structure_slots;
create trigger prevent_locked_match_structure_slot_delete_trigger
before delete on public.launch_match_structure_slots
for each row execute function public.prevent_locked_match_structure_slot_change();

drop trigger if exists validate_match_structure_finalize_trigger
  on public.launch_match_structure_locks;
create trigger validate_match_structure_finalize_trigger
before update on public.launch_match_structure_locks
for each row execute function public.validate_match_structure_finalize();

alter table public.launch_match_structure_locks enable row level security;
alter table public.launch_match_structure_slots enable row level security;

-- Initial V1 is server-side only. Captain editing can be added later through a
-- narrow RPC after the workflow/UI is approved; no direct authenticated table
-- policy is opened here.
revoke all on table public.launch_match_structure_locks from anon, authenticated;
revoke all on table public.launch_match_structure_slots from anon, authenticated;
grant all on table public.launch_match_structure_locks to service_role;
grant all on table public.launch_match_structure_slots to service_role;
grant usage, select on sequence public.launch_match_structure_slots_id_seq to service_role;

comment on table public.launch_match_structure_locks is
  'Pre-match immutable Singles/Doubles assignment structure, separate from result-entry contests.';
comment on table public.launch_match_structure_slots is
  'All 72 standard player slots; null player_id on a locked structure is an intentional unfilled slot.';
