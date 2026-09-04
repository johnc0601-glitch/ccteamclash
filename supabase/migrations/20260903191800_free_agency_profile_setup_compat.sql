-- Some non-production environments predate the player setup column even though
-- current Account registration code depends on it. Production already has it.
alter table public.launch_profiles
  add column if not exists played_before boolean;
