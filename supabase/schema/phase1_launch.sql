create table if not exists public.launch_teams (
  id text primary key,
  name text not null,
  short_name text not null,
  logo text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.launch_players (
  id text primary key,
  name text not null,
  gender text not null default 'Unknown' check (gender in ('Male', 'Female', 'Unknown')),
  pdga_number text not null default '',
  pdga_rating integer null,
  current_team_id text null references public.launch_teams(id) on delete set null,
  home_area text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.launch_profiles (
  id text primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'Player' check (role in ('Player', 'Captain', 'Commissioner')),
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Suspended', 'Rejected')),
  player_id text null references public.launch_players(id) on delete set null,
  captain_team_id text null references public.launch_teams(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.launch_player_claims (
  id text primary key,
  profile_id text not null references public.launch_profiles(id) on delete cascade,
  requested_player_id text null references public.launch_players(id) on delete set null,
  submitted_name text not null,
  submitted_pdga_number text not null default '',
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected', 'Cancelled')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  reviewed_by text null references public.launch_profiles(id) on delete set null
);

create table if not exists public.launch_events (
  id text primary key,
  season_label text not null,
  home_team_id text not null references public.launch_teams(id) on delete restrict,
  away_team_id text not null references public.launch_teams(id) on delete restrict,
  course_name text not null,
  directions_url text not null default '',
  date date not null,
  time time not null,
  status text not null default 'Scheduled' check (status in ('Scheduled', 'Final', 'Cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);

create table if not exists public.launch_event_rosters (
  id text primary key,
  event_id text not null references public.launch_events(id) on delete cascade,
  team_id text not null references public.launch_teams(id) on delete cascade,
  submitted_by_profile_id text null references public.launch_profiles(id) on delete set null,
  status text not null default 'Open' check (status in ('Open', 'Submitted', 'Locked')),
  submitted_at timestamptz null,
  locked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, team_id)
);

create table if not exists public.launch_event_roster_players (
  id text primary key,
  event_roster_id text not null references public.launch_event_rosters(id) on delete cascade,
  player_id text not null references public.launch_players(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_roster_id, player_id)
);

create table if not exists public.launch_event_posts (
  id text primary key,
  event_id text not null references public.launch_events(id) on delete cascade,
  type text not null check (type in ('Comment', 'Photo')),
  author_name text not null default '',
  body text not null default '',
  image_url text null,
  status text not null default 'Visible' check (status in ('Visible', 'Removed')),
  created_at timestamptz not null default now(),
  removed_at timestamptz null,
  removed_by text null references public.launch_profiles(id) on delete set null
);

create index if not exists launch_profiles_user_id_idx on public.launch_profiles(user_id);
create index if not exists launch_profiles_status_idx on public.launch_profiles(status);
create index if not exists launch_profiles_player_id_idx on public.launch_profiles(player_id);
create index if not exists launch_profiles_captain_team_id_idx on public.launch_profiles(captain_team_id);
create index if not exists launch_player_claims_profile_id_idx on public.launch_player_claims(profile_id);
create index if not exists launch_player_claims_requested_player_id_idx on public.launch_player_claims(requested_player_id);
create index if not exists launch_player_claims_reviewed_by_idx on public.launch_player_claims(reviewed_by);
create index if not exists launch_player_claims_status_idx on public.launch_player_claims(status);
create index if not exists launch_players_current_team_id_idx on public.launch_players(current_team_id);
create index if not exists launch_events_date_idx on public.launch_events(date);
create index if not exists launch_events_home_team_id_idx on public.launch_events(home_team_id);
create index if not exists launch_events_away_team_id_idx on public.launch_events(away_team_id);
create index if not exists launch_event_rosters_event_id_idx on public.launch_event_rosters(event_id);
create index if not exists launch_event_rosters_team_id_idx on public.launch_event_rosters(team_id);
create index if not exists launch_event_rosters_submitted_by_profile_id_idx on public.launch_event_rosters(submitted_by_profile_id);
create index if not exists launch_event_roster_players_roster_id_idx on public.launch_event_roster_players(event_roster_id);
create index if not exists launch_event_roster_players_player_id_idx on public.launch_event_roster_players(player_id);
create index if not exists launch_event_posts_event_id_idx on public.launch_event_posts(event_id);
create index if not exists launch_event_posts_status_idx on public.launch_event_posts(status);
create index if not exists launch_event_posts_removed_by_idx on public.launch_event_posts(removed_by);

alter table public.launch_profiles enable row level security;
alter table public.launch_player_claims enable row level security;
alter table public.launch_players enable row level security;
alter table public.launch_teams enable row level security;
alter table public.launch_events enable row level security;
alter table public.launch_event_rosters enable row level security;
alter table public.launch_event_roster_players enable row level security;
alter table public.launch_event_posts enable row level security;

grant usage on schema public to authenticated;
grant select on public.launch_players to authenticated;
grant select on public.launch_teams to authenticated;
grant select, insert, update on public.launch_profiles to authenticated;
grant select, insert on public.launch_player_claims to authenticated;

drop policy if exists "launch users read own profile" on public.launch_profiles;
create policy "launch users read own profile"
on public.launch_profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "launch users create pending profile" on public.launch_profiles;
create policy "launch users create pending profile"
on public.launch_profiles
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and role = 'Player'
  and status = 'Pending'
  and player_id is null
  and captain_team_id is null
);

drop policy if exists "launch users update own pending profile" on public.launch_profiles;
create policy "launch users update own pending profile"
on public.launch_profiles
for update
to authenticated
using ((select auth.uid()) = user_id and status = 'Pending')
with check (
  (select auth.uid()) = user_id
  and role = 'Player'
  and status = 'Pending'
  and player_id is null
  and captain_team_id is null
);

drop policy if exists "launch users read active players" on public.launch_players;
create policy "launch users read active players"
on public.launch_players
for select
to authenticated
using (active = true);

drop policy if exists "launch users read active teams" on public.launch_teams;
create policy "launch users read active teams"
on public.launch_teams
for select
to authenticated
using (active = true);

drop policy if exists "launch users read own claims" on public.launch_player_claims;
create policy "launch users read own claims"
on public.launch_player_claims
for select
to authenticated
using (
  exists (
    select 1
    from public.launch_profiles profile
    where profile.id = launch_player_claims.profile_id
      and profile.user_id = (select auth.uid())
  )
);

drop policy if exists "launch users create own claims" on public.launch_player_claims;
create policy "launch users create own claims"
on public.launch_player_claims
for insert
to authenticated
with check (
  status = 'Pending'
  and reviewed_at is null
  and reviewed_by is null
  and exists (
    select 1
    from public.launch_profiles profile
    where profile.id = launch_player_claims.profile_id
      and profile.user_id = (select auth.uid())
  )
);
