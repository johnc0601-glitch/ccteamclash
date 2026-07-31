create table if not exists public.launch_team_aliases (
  normalized_alias text primary key,
  alias text not null,
  team_id text not null references public.launch_teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.launch_team_aliases enable row level security;

grant select, insert, update on public.launch_team_aliases to authenticated;

create policy "commissioners read team import aliases"
on public.launch_team_aliases for select to authenticated
using ((select private.is_launch_commissioner()));

create policy "commissioners create team import aliases"
on public.launch_team_aliases for insert to authenticated
with check ((select private.is_launch_commissioner()));

create policy "commissioners update team import aliases"
on public.launch_team_aliases for update to authenticated
using ((select private.is_launch_commissioner()))
with check ((select private.is_launch_commissioner()));
