create table if not exists public.launch_seasons (
  id text primary key,
  name text not null unique,
  year integer not null,
  description text not null default '',
  start_date date not null,
  end_date date not null,
  registration_open boolean not null default false,
  active boolean not null default false,
  published boolean not null default false,
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);

create unique index if not exists launch_seasons_one_active_idx
on public.launch_seasons (active)
where active = true;

create table if not exists public.launch_courses (
  id text primary key,
  name text not null unique,
  city text not null,
  state text not null,
  address text not null default '',
  map_url text not null default '',
  udisc_url text not null default '',
  photo_url text not null default '',
  description text not null default '',
  home_team_id text null references public.launch_teams(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.launch_schedules (
  id text primary key,
  season_id text not null references public.launch_seasons(id) on delete cascade,
  name text not null,
  description text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, name)
);

create table if not exists public.launch_rounds (
  id text primary key,
  schedule_id text not null references public.launch_schedules(id) on delete cascade,
  season_id text not null references public.launch_seasons(id) on delete cascade,
  number integer not null check (number > 0),
  name text not null,
  date date not null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (schedule_id, number),
  unique (schedule_id, name)
);

create table if not exists public.launch_schedule_matches (
  id text primary key,
  round_id text not null references public.launch_rounds(id) on delete cascade,
  season_id text not null references public.launch_seasons(id) on delete cascade,
  home_team_id text not null references public.launch_teams(id) on delete restrict,
  away_team_id text not null references public.launch_teams(id) on delete restrict,
  course_id text not null references public.launch_courses(id) on delete restrict,
  date date not null,
  time time not null,
  status text not null default 'Scheduled'
    check (status in ('Scheduled', 'Completed', 'Postponed', 'Cancelled', 'Rain Delay')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);

create index if not exists launch_schedules_season_id_idx on public.launch_schedules(season_id);
create index if not exists launch_rounds_schedule_id_idx on public.launch_rounds(schedule_id);
create index if not exists launch_rounds_season_id_idx on public.launch_rounds(season_id);
create index if not exists launch_schedule_matches_round_id_idx on public.launch_schedule_matches(round_id);
create index if not exists launch_schedule_matches_season_id_idx on public.launch_schedule_matches(season_id);

alter table public.launch_seasons enable row level security;
alter table public.launch_courses enable row level security;
alter table public.launch_schedules enable row level security;
alter table public.launch_rounds enable row level security;
alter table public.launch_schedule_matches enable row level security;

grant select on public.launch_seasons, public.launch_courses, public.launch_schedules,
  public.launch_rounds, public.launch_schedule_matches to anon;
grant select, insert, update, delete on public.launch_seasons, public.launch_courses,
  public.launch_schedules, public.launch_rounds, public.launch_schedule_matches to authenticated;

create policy "public reads published launch seasons"
on public.launch_seasons for select to anon
using (published = true and archived = false);

create policy "public reads active launch courses"
on public.launch_courses for select to anon
using (active = true);

create policy "public reads published launch schedules"
on public.launch_schedules for select to anon
using (published = true);

create policy "public reads published launch rounds"
on public.launch_rounds for select to anon
using (
  published = true
  and exists (
    select 1 from public.launch_schedules schedule
    where schedule.id = launch_rounds.schedule_id and schedule.published = true
  )
);

create policy "public reads published launch schedule matches"
on public.launch_schedule_matches for select to anon
using (
  exists (
    select 1
    from public.launch_rounds round
    join public.launch_schedules schedule on schedule.id = round.schedule_id
    where round.id = launch_schedule_matches.round_id
      and round.published = true
      and schedule.published = true
  )
);

create policy "commissioners manage launch seasons"
on public.launch_seasons for all to authenticated
using ((select private.is_launch_commissioner()))
with check ((select private.is_launch_commissioner()));

create policy "commissioners manage launch courses"
on public.launch_courses for all to authenticated
using ((select private.is_launch_commissioner()))
with check ((select private.is_launch_commissioner()));

create policy "commissioners manage launch schedules"
on public.launch_schedules for all to authenticated
using ((select private.is_launch_commissioner()))
with check ((select private.is_launch_commissioner()));

create policy "commissioners manage launch rounds"
on public.launch_rounds for all to authenticated
using ((select private.is_launch_commissioner()))
with check ((select private.is_launch_commissioner()));

create policy "commissioners manage launch schedule matches"
on public.launch_schedule_matches for all to authenticated
using ((select private.is_launch_commissioner()))
with check ((select private.is_launch_commissioner()));

insert into public.launch_seasons (
  id, name, year, description, start_date, end_date, registration_open,
  active, published, archived, created_at, updated_at
) values (
  'summer-team-clash-2026', 'Summer Team Clash 2026', 2026,
  'The current championship season for weekly team match play.',
  '2026-06-06', '2026-09-26', true, true, true, false,
  '2026-01-05T15:00:00.000Z', '2026-07-12T17:30:00.000Z'
) on conflict (id) do nothing;

insert into public.launch_courses (
  id, name, city, state, address, map_url, udisc_url, photo_url,
  description, home_team_id, active
) values
  ('beast-on-honey-hill', 'Beast on Honey Hill', 'Whiteville', 'NC', '2210 Honey Hill Rd, Hallsboro, NC 28442', 'https://www.google.com/maps/search/?api=1&query=2210+Honey+Hill+Rd+Hallsboro+NC+28442', 'https://udisc.com/courses/the-beast-on-honey-hill-X1Pc', '', 'League course details and current layout information are maintained on UDisc.', 'beast-mode', true),
  ('castle-hayne-park', 'Castle Hayne Park', 'Castle Hayne', 'NC', '4700 Old Ave, Castle Hayne, NC 28429', 'https://www.google.com/maps/search/?api=1&query=4700+Old+Ave+Castle+Hayne+NC+28429', 'https://udisc.com/courses/castle-hayne-park-Jkk8', '', 'League course details and current layout information are maintained on UDisc.', null, true),
  ('cougar-country', 'Cougar Country', 'Boiling Spring Lakes', 'NC', '1 Leeds Rd, Boiling Spring Lakes, NC 28461', 'https://www.google.com/maps/search/?api=1&query=1+Leeds+Rd+Boiling+Spring+Lakes+NC+28461', 'https://udisc.com/courses/cougar-country-7ZvT', '', 'League course details and current layout information are maintained on UDisc.', 'cougar-country', true),
  ('joe-eakes', 'Joe Eakes Park', 'Kure Beach', 'NC', 'K Avenue & S 7th Ave, Kure Beach, NC 28449', 'https://www.google.com/maps/search/?api=1&query=K+Avenue+%26+S+7th+Ave+Kure+Beach+NC+28449', 'https://udisc.com/courses/joe-eakes-park-RSG1', '', 'League course details and current layout information are maintained on UDisc.', 'kb', true),
  ('northeast-creek-park', 'Northeast Creek Park', 'Jacksonville', 'NC', '910 Corbin St, Jacksonville, NC 28546', 'https://www.google.com/maps/search/?api=1&query=910+Corbin+St+Jacksonville+NC+28546', 'https://udisc.com/courses/northeast-creek-park-UIAe', '', 'League course details and current layout information are maintained on UDisc.', null, true),
  ('splinter-city', 'Splinter City', 'Myrtle Beach', 'SC', '3383 Splinter City Rd, Myrtle Beach, SC 29577', 'https://www.google.com/maps/search/?api=1&query=3383+Splinter+City+Rd+Myrtle+Beach+SC+29577', 'https://app.udisc.com/courses/splinter-city-dgc-mXj6', '', 'League course details and current layout information are maintained on UDisc.', null, true),
  ('wild-turkey', 'Wild Turkey', 'Hampstead', 'NC', '20000 US-17, Hampstead, NC 28443', 'https://www.google.com/maps/search/?api=1&query=20000+US-17+Hampstead+NC+28440', 'https://udisc.com/courses/wild-turkey-disc-course-75Jd', '', 'League course details and current layout information are maintained on UDisc.', 'wild-turkey', true)
on conflict (id) do nothing;

insert into public.launch_schedules (
  id, season_id, name, description, published, created_at, updated_at
) values (
  'summer-2026-championship', 'summer-team-clash-2026',
  '2026 Championship Schedule',
  'Published regular-season rounds for the current Team Clash championship.',
  true, '2026-04-02T14:00:00.000Z', '2026-07-10T18:30:00.000Z'
) on conflict (id) do nothing;

insert into public.launch_rounds (
  id, schedule_id, season_id, number, name, date, published, created_at, updated_at
) values (
  'summer-2026-round-1', 'summer-2026-championship', 'summer-team-clash-2026',
  1, 'Opening Round', '2026-07-18', true,
  '2026-04-02T14:15:00.000Z', '2026-07-10T18:30:00.000Z'
) on conflict (id) do nothing;

insert into public.launch_schedule_matches (
  id, round_id, season_id, home_team_id, away_team_id, course_id,
  date, time, status, notes, created_at, updated_at
) values
  ('summer-2026-r1-dark-ninjas', 'summer-2026-round-1', 'summer-team-clash-2026', 'dark-knights', 'ninjas', 'castle-hayne-park', '2026-07-18', '09:00', 'Scheduled', '', '2026-04-02T14:30:00.000Z', '2026-07-10T18:30:00.000Z'),
  ('summer-2026-r1-beast-cougar', 'summer-2026-round-1', 'summer-team-clash-2026', 'beast-mode', 'cougar-country', 'castle-hayne-park', '2026-07-18', '09:30', 'Scheduled', '', '2026-04-02T14:35:00.000Z', '2026-07-10T18:30:00.000Z'),
  ('summer-2026-r1-hayneous-kb', 'summer-2026-round-1', 'summer-team-clash-2026', 'hayneous-og-s', 'kb', 'castle-hayne-park', '2026-07-18', '10:00', 'Scheduled', '', '2026-04-02T14:40:00.000Z', '2026-07-10T18:30:00.000Z'),
  ('summer-2026-r1-riptide-turkey', 'summer-2026-round-1', 'summer-team-clash-2026', 'riptide', 'wild-turkey', 'castle-hayne-park', '2026-07-18', '10:30', 'Scheduled', '', '2026-04-02T14:45:00.000Z', '2026-07-10T18:30:00.000Z')
on conflict (id) do nothing;
