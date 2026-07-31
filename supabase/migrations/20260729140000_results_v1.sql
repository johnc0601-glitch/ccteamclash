create table if not exists public.launch_match_results (
  match_id text primary key references public.launch_schedule_matches(id) on delete cascade,
  home_score integer null check (home_score >= 0),
  away_score integer null check (away_score >= 0),
  status text not null default 'Draft' check (status in ('Draft', 'Published')),
  published_at timestamptz null,
  reopened_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    status = 'Draft'
    or (home_score is not null and away_score is not null and published_at is not null)
  )
);

alter table public.launch_match_results enable row level security;

grant select on public.launch_match_results to anon;
grant select, insert, update, delete on public.launch_match_results to authenticated;

create policy "public reads published match results"
on public.launch_match_results for select to anon
using (status = 'Published');

create policy "authenticated reads published match results"
on public.launch_match_results for select to authenticated
using (status = 'Published' or (select private.is_launch_commissioner()));

create policy "commissioners create match results"
on public.launch_match_results for insert to authenticated
with check ((select private.is_launch_commissioner()));

create policy "commissioners update match results"
on public.launch_match_results for update to authenticated
using ((select private.is_launch_commissioner()))
with check ((select private.is_launch_commissioner()));

create policy "commissioners delete match results"
on public.launch_match_results for delete to authenticated
using ((select private.is_launch_commissioner()));
