create table public.launch_leagues (
  id text primary key,
  name text not null unique,
  short_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.launch_leagues enable row level security;

grant select on public.launch_leagues to anon;
grant select, insert, update, delete on public.launch_leagues to authenticated;

create policy "public reads active launch leagues"
on public.launch_leagues for select to anon
using (active = true);

create policy "authenticated reads launch leagues"
on public.launch_leagues for select to authenticated
using (active = true or (select private.is_launch_commissioner()));

create policy "commissioners manage launch leagues"
on public.launch_leagues for all to authenticated
using ((select private.is_launch_commissioner()))
with check ((select private.is_launch_commissioner()));

insert into public.launch_leagues (
  id, name, short_name, active, created_at, updated_at
) values (
  'cc-team-clash', 'CCTeamClash', 'Team Clash', true,
  '2026-01-05T15:00:00.000Z', '2026-01-05T15:00:00.000Z'
);

alter table public.launch_seasons add column league_id text;

update public.launch_seasons
set league_id = 'cc-team-clash'
where league_id is null;

alter table public.launch_seasons alter column league_id set not null;
alter table public.launch_seasons
  add constraint launch_seasons_league_id_fkey
  foreign key (league_id) references public.launch_leagues(id) on delete restrict;

create index launch_seasons_league_id_idx on public.launch_seasons(league_id);
