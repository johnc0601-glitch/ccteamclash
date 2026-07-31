insert into public.launch_seasons (
  id, league_id, name, year, description, start_date, end_date,
  registration_open, active, published, archived
) values
  (
    'coastal-clash-2024-2025', 'cc-team-clash', 'Coastal Clash Match Play 2024-2025', 2025,
    'Imported historical Team Clash season.', '2024-11-01', '2025-03-31',
    false, false, true, true
  ),
  (
    'coastal-clash-2025-2026', 'cc-team-clash', 'Coastal Clash Match Play 2025-2026', 2026,
    'Imported historical Team Clash season.', '2025-10-01', '2026-03-31',
    false, false, true, true
  )
on conflict (id) do nothing;

create table public.historical_player_matchups (
  deduplication_key text primary key,
  season_id text not null references public.launch_seasons(id) on delete restrict,
  season_name text not null,
  event_label text not null,
  event_month text not null,
  event_order integer not null check (event_order > 0),
  match_format text not null check (match_format in ('Singles', 'Doubles')),
  player_id text not null references public.launch_players(id) on delete restrict,
  player_name text not null,
  player_team_id text not null references public.launch_teams(id) on delete restrict,
  player_team_name text not null,
  partner_player_id text null references public.launch_players(id) on delete restrict,
  partner_player_name text null,
  opponent_one_player_id text not null references public.launch_players(id) on delete restrict,
  opponent_one_player_name text not null,
  opponent_two_player_id text null references public.launch_players(id) on delete restrict,
  opponent_two_player_name text null,
  opponent_team_id text not null references public.launch_teams(id) on delete restrict,
  opponent_team_name text not null,
  outcome text not null check (outcome in ('W', 'L', 'T')),
  raw_result text null,
  raw_score text null,
  source_workbook text not null,
  source_sheet text not null,
  source_row integer not null check (source_row > 0),
  imported_at timestamptz not null default now(),
  check (
    (match_format = 'Singles'
      and partner_player_id is null and partner_player_name is null
      and opponent_two_player_id is null and opponent_two_player_name is null)
    or
    (match_format = 'Doubles'
      and partner_player_id is not null and partner_player_name is not null
      and opponent_two_player_id is not null and opponent_two_player_name is not null)
  )
);

create index historical_player_matchups_player_order_idx
  on public.historical_player_matchups (player_id, season_id, event_order desc);

alter table public.historical_player_matchups enable row level security;

grant select on public.historical_player_matchups to anon, authenticated;
grant insert, update, delete on public.historical_player_matchups to authenticated;

create policy "public reads official historical player matchups"
on public.historical_player_matchups for select to anon, authenticated
using (true);

create policy "commissioners import historical player matchups"
on public.historical_player_matchups for insert to authenticated
with check ((select private.is_launch_commissioner()));

create policy "commissioners update historical player matchups"
on public.historical_player_matchups for update to authenticated
using ((select private.is_launch_commissioner()))
with check ((select private.is_launch_commissioner()));

create policy "commissioners delete historical player matchups"
on public.historical_player_matchups for delete to authenticated
using ((select private.is_launch_commissioner()));
