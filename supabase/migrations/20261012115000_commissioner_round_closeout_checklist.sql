-- One commissioner-reviewed checklist per officially scheduled round.
-- Publication and CI completion remain derived from their authoritative records.
create table if not exists public.launch_round_closeout_checks (
  round_id text not null references public.launch_rounds(id) on delete cascade,
  check_key text not null check (check_key in (
    'whiteboards', 'adjustments', 'no_shows', 'standings', 'pulse', 'recap', 'closed'
  )),
  checked boolean not null default false,
  checked_at timestamptz,
  checked_by_profile_id text,
  updated_at timestamptz not null default now(),
  primary key (round_id, check_key),
  constraint round_closeout_checked_timestamp
    check ((checked and checked_at is not null) or (not checked and checked_at is null))
);

alter table public.launch_round_closeout_checks enable row level security;

revoke all on public.launch_round_closeout_checks from anon, authenticated;
grant select, insert, update on public.launch_round_closeout_checks to authenticated;

create policy "commissioners read round checklist"
  on public.launch_round_closeout_checks
  for select to authenticated
  using ((select private.is_launch_commissioner()));

create policy "commissioners add round checklist entries"
  on public.launch_round_closeout_checks
  for insert to authenticated
  with check ((select private.is_launch_commissioner()));

create policy "commissioners update round checklist entries"
  on public.launch_round_closeout_checks
  for update to authenticated
  using ((select private.is_launch_commissioner()))
  with check ((select private.is_launch_commissioner()));
