alter table public.launch_schedule_matches alter column home_team_id drop not null;
alter table public.launch_schedule_matches alter column away_team_id drop not null;
alter table public.launch_schedule_matches alter column course_id drop not null;
alter table public.launch_schedule_matches alter column date drop not null;

create table public.launch_playoff_brackets (
  id text primary key,
  season_id text not null unique references public.launch_seasons(id) on delete cascade,
  status text not null default 'Draft' check (status in ('Draft', 'Published')),
  regular_season_locked_at timestamptz not null,
  published_at timestamptz null,
  champion_team_id text null references public.launch_teams(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.launch_playoff_games (
  id text primary key,
  bracket_id text not null references public.launch_playoff_brackets(id) on delete cascade,
  stage text not null check (stage in ('Semifinal', 'Championship')),
  position integer not null check (position in (1, 2)),
  match_id text not null unique references public.launch_schedule_matches(id) on delete restrict,
  home_seed integer null check (home_seed between 1 and 4),
  away_seed integer null check (away_seed between 1 and 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (bracket_id, stage, position),
  check (
    (stage = 'Semifinal' and home_seed is not null and away_seed is not null)
    or (stage = 'Championship' and position = 1 and home_seed is null and away_seed is null)
  )
);

create index launch_playoff_games_bracket_id_idx on public.launch_playoff_games(bracket_id);
create index launch_playoff_brackets_champion_team_id_idx
on public.launch_playoff_brackets(champion_team_id);

alter table public.launch_playoff_brackets enable row level security;
alter table public.launch_playoff_games enable row level security;
grant select on public.launch_playoff_brackets, public.launch_playoff_games to anon;
grant select, insert, update, delete on public.launch_playoff_brackets, public.launch_playoff_games to authenticated;

create policy "public reads published playoff brackets"
on public.launch_playoff_brackets for select to anon using (status = 'Published');
create policy "authenticated reads playoff brackets"
on public.launch_playoff_brackets for select to authenticated
using (status = 'Published' or (select private.is_launch_commissioner()));
create policy "commissioners manage playoff brackets"
on public.launch_playoff_brackets for all to authenticated
using ((select private.is_launch_commissioner()))
with check ((select private.is_launch_commissioner()));

create policy "public reads published playoff games"
on public.launch_playoff_games for select to anon
using (exists (
  select 1 from public.launch_playoff_brackets bracket
  where bracket.id = launch_playoff_games.bracket_id and bracket.status = 'Published'
));
create policy "authenticated reads playoff games"
on public.launch_playoff_games for select to authenticated
using (
  (select private.is_launch_commissioner())
  or exists (
    select 1 from public.launch_playoff_brackets bracket
    where bracket.id = launch_playoff_games.bracket_id and bracket.status = 'Published'
  )
);
create policy "commissioners manage playoff games"
on public.launch_playoff_games for all to authenticated
using ((select private.is_launch_commissioner()))
with check ((select private.is_launch_commissioner()));

insert into public.launch_schedules (
  id, season_id, name, description, published, created_at, updated_at
) values (
  'summer-2026-playoff-planning', 'summer-team-clash-2026', '2026 Playoff Schedule',
  'Preseason playoff match placeholders.', false, now(), now()
) on conflict (id) do nothing;

insert into public.launch_rounds (
  id, schedule_id, season_id, number, name, date, published, created_at, updated_at
) values (
  'summer-2026-draft-round-1', 'summer-2026-playoff-planning',
  'summer-team-clash-2026', 1, 'Semifinals', '2026-09-19', false, now(), now()
) on conflict (id) do nothing;

insert into public.launch_rounds (
  id, schedule_id, season_id, number, name, date, published, created_at, updated_at
) values (
  'summer-2026-playoff-championship-round', 'summer-2026-playoff-planning',
  'summer-team-clash-2026', 2, 'Championship', '2026-09-26', false, now(), now()
) on conflict (id) do nothing;

insert into public.launch_schedule_matches (
  id, round_id, season_id, home_team_id, away_team_id, course_id,
  date, time, status, notes, created_at, updated_at
) values
  ('summer-2026-playoff-sf1', 'summer-2026-draft-round-1', 'summer-team-clash-2026', null, null, null, null, '09:00', 'Scheduled', 'Playoff semifinal 1 placeholder.', now(), now()),
  ('summer-2026-playoff-sf2', 'summer-2026-draft-round-1', 'summer-team-clash-2026', null, null, null, null, '10:30', 'Scheduled', 'Playoff semifinal 2 placeholder.', now(), now()),
  ('summer-2026-playoff-final', 'summer-2026-playoff-championship-round', 'summer-team-clash-2026', null, null, null, null, '09:00', 'Scheduled', 'Playoff championship placeholder.', now(), now())
on conflict (id) do nothing;
