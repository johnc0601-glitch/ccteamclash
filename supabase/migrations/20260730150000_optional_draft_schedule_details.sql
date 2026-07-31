alter table public.launch_rounds
  alter column date drop not null;

alter table public.launch_schedule_matches
  alter column time drop not null;
