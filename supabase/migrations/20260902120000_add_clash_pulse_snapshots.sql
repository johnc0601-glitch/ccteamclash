create table if not exists public.clash_pulse_snapshots (
  season_id text primary key,
  season_name text,
  candidate_payload jsonb not null,
  provenance jsonb not null,
  generated_at timestamptz not null default now(),
  generated_by uuid not null references auth.users(id),
  refresh_trigger text not null,
  constraint clash_pulse_snapshots_candidate_payload_object check (jsonb_typeof(candidate_payload) = 'object'),
  constraint clash_pulse_snapshots_provenance_object check (jsonb_typeof(provenance) = 'object'),
  constraint clash_pulse_snapshots_refresh_trigger_present check (length(btrim(refresh_trigger)) > 0)
);

alter table public.clash_pulse_snapshots enable row level security;
revoke all on table public.clash_pulse_snapshots from public, anon, authenticated;
grant select, insert, update on table public.clash_pulse_snapshots to authenticated;

create policy "commissioners read clash pulse snapshots" on public.clash_pulse_snapshots
for select to authenticated using ((select private.is_launch_commissioner()));
create policy "commissioners insert clash pulse snapshots" on public.clash_pulse_snapshots
for insert to authenticated with check ((select private.is_launch_commissioner()) and generated_by = (select auth.uid()));
create policy "commissioners update clash pulse snapshots" on public.clash_pulse_snapshots
for update to authenticated using ((select private.is_launch_commissioner()))
with check ((select private.is_launch_commissioner()) and generated_by = (select auth.uid()));

comment on table public.clash_pulse_snapshots is
  'Materialized Clash Pulse reports and source provenance; never a source of ratings, results, or stories.';
