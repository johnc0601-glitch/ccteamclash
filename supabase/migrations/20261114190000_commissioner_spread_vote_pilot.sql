-- Private commissioner pilot; permanently stores each match's first voted-on line.
create table if not exists public.launch_match_spread_polls (
  match_id text primary key references public.launch_schedule_matches(id) on delete cascade,
  home_team_id text not null references public.launch_teams(id),
  away_team_id text not null references public.launch_teams(id),
  home_line numeric(4,1) not null check (
    home_line between -36 and 36 and home_line <> 0
    and home_line * 2 = trunc(home_line * 2)
  ),
  created_by_profile_id text not null references public.launch_profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
comment on table public.launch_match_spread_polls is 'Favored-by line frozen on the first commissioner ballot.';
create table if not exists public.launch_match_spread_votes (
  match_id text not null references public.launch_match_spread_polls(match_id) on delete cascade,
  profile_id text not null references public.launch_profiles(id) on delete cascade,
  choice text not null check (choice in ('high', 'low')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (match_id, profile_id)
);
create index if not exists launch_match_spread_votes_profile_idx on public.launch_match_spread_votes(profile_id);
alter table public.launch_match_spread_polls enable row level security;
alter table public.launch_match_spread_votes enable row level security;
-- No anon/member read or write policies. The server verifies the current account
-- is an approved commissioner before using the privileged service client.
revoke all on table public.launch_match_spread_polls, public.launch_match_spread_votes from public, anon, authenticated;
grant select, insert, update, delete on table public.launch_match_spread_polls, public.launch_match_spread_votes to service_role;
