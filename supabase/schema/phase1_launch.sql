create table if not exists public.teams (
  id text primary key,
  name text not null,
  short_name text not null,
  logo text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.players (
  id text primary key,
  name text not null,
  gender text not null default 'Unknown' check (gender in ('Male', 'Female', 'Unknown')),
  pdga_number text not null default '',
  pdga_rating integer null,
  current_team_id text null references public.teams(id) on delete set null,
  home_area text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id text primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null default '',
  role text not null default 'Player' check (role in ('Player', 'Captain', 'Commissioner')),
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Suspended', 'Rejected')),
  player_id text null references public.players(id) on delete set null,
  captain_team_id text null references public.teams(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.player_claims (
  id text primary key,
  profile_id text not null references public.profiles(id) on delete cascade,
  requested_player_id text null references public.players(id) on delete set null,
  submitted_name text not null,
  submitted_pdga_number text not null default '',
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected', 'Cancelled')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  reviewed_by text null references public.profiles(id) on delete set null
);

create table if not exists public.events (
  id text primary key,
  season_label text not null,
  home_team_id text not null references public.teams(id) on delete restrict,
  away_team_id text not null references public.teams(id) on delete restrict,
  course_name text not null,
  directions_url text not null default '',
  date date not null,
  time time not null,
  status text not null default 'Scheduled' check (status in ('Scheduled', 'Final', 'Cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);

create table if not exists public.event_rosters (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  team_id text not null references public.teams(id) on delete cascade,
  submitted_by_profile_id text null references public.profiles(id) on delete set null,
  status text not null default 'Open' check (status in ('Open', 'Submitted', 'Locked')),
  submitted_at timestamptz null,
  locked_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, team_id)
);

create table if not exists public.event_roster_players (
  id text primary key,
  event_roster_id text not null references public.event_rosters(id) on delete cascade,
  player_id text not null references public.players(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_roster_id, player_id)
);

create table if not exists public.event_posts (
  id text primary key,
  event_id text not null references public.events(id) on delete cascade,
  type text not null check (type in ('Comment', 'Photo')),
  author_name text not null default '',
  body text not null default '',
  image_url text null,
  status text not null default 'Visible' check (status in ('Visible', 'Removed')),
  created_at timestamptz not null default now(),
  removed_at timestamptz null,
  removed_by text null references public.profiles(id) on delete set null
);

create index if not exists profiles_user_id_idx on public.profiles(user_id);
create index if not exists profiles_status_idx on public.profiles(status);
create index if not exists profiles_captain_team_id_idx on public.profiles(captain_team_id);
create index if not exists player_claims_profile_id_idx on public.player_claims(profile_id);
create index if not exists player_claims_status_idx on public.player_claims(status);
create index if not exists players_current_team_id_idx on public.players(current_team_id);
create index if not exists events_date_idx on public.events(date);
create index if not exists events_home_team_id_idx on public.events(home_team_id);
create index if not exists events_away_team_id_idx on public.events(away_team_id);
create index if not exists event_rosters_event_id_idx on public.event_rosters(event_id);
create index if not exists event_rosters_team_id_idx on public.event_rosters(team_id);
create index if not exists event_roster_players_roster_id_idx on public.event_roster_players(event_roster_id);
create index if not exists event_posts_event_id_idx on public.event_posts(event_id);
create index if not exists event_posts_status_idx on public.event_posts(status);

alter table public.profiles enable row level security;
alter table public.player_claims enable row level security;
alter table public.players enable row level security;
alter table public.teams enable row level security;
alter table public.events enable row level security;
alter table public.event_rosters enable row level security;
alter table public.event_roster_players enable row level security;
alter table public.event_posts enable row level security;
