-- Around the Clash recap drafts retain the exact canonical CI facts used at draft creation.
-- This keeps published journalism stable even if the live CI ledger is later rebuilt.

alter table public.launch_stories
  add column if not exists source_fact_snapshot jsonb not null default '[]'::jsonb;

alter table public.launch_stories
  drop constraint if exists launch_stories_source_fact_snapshot_check;

alter table public.launch_stories
  add constraint launch_stories_source_fact_snapshot_check
  check (jsonb_typeof(source_fact_snapshot) = 'array');
