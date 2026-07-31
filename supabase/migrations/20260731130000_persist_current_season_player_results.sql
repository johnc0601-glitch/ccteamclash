create table public.launch_result_contests (
  id text primary key,
  match_id text not null references public.launch_match_results(match_id) on delete cascade,
  format text not null check (format in ('Singles', 'Doubles')),
  position integer not null check (position > 0),
  home_outcome text not null check (home_outcome in ('W', 'L', 'T')),
  away_outcome text not null check (away_outcome in ('W', 'L', 'T')),
  home_score integer null check (home_score >= 0),
  away_score integer null check (away_score >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (match_id, format, position),
  check (
    (home_outcome = 'W' and away_outcome = 'L')
    or (home_outcome = 'L' and away_outcome = 'W')
    or (home_outcome = 'T' and away_outcome = 'T')
  ),
  check (
    (format = 'Singles' and (home_score is null) = (away_score is null))
    or (format = 'Doubles' and home_score is null and away_score is null)
  ),
  check (
    home_score is null
    or (home_score > away_score and home_outcome = 'W')
    or (home_score < away_score and home_outcome = 'L')
    or (home_score = away_score and home_outcome = 'T')
  )
);

create table public.launch_result_contest_players (
  contest_id text not null references public.launch_result_contests(id) on delete cascade,
  player_id text not null references public.launch_players(id) on delete restrict,
  team_id text not null references public.launch_teams(id) on delete restrict,
  side text not null check (side in ('Home', 'Away')),
  slot integer not null check (slot in (1, 2)),
  player_name text not null,
  team_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (contest_id, side, slot),
  unique (contest_id, player_id)
);

create index launch_result_contests_match_id_idx
  on public.launch_result_contests (match_id);
create index launch_result_contest_players_player_id_idx
  on public.launch_result_contest_players (player_id);
create index launch_result_contest_players_team_id_idx
  on public.launch_result_contest_players (team_id);

create or replace function private.set_launch_result_player_snapshots()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private
as $$
declare
  expected_team_id text;
begin
  select case when new.side = 'Home' then match.home_team_id else match.away_team_id end
    into expected_team_id
  from public.launch_result_contests contest
  join public.launch_schedule_matches match on match.id = contest.match_id
  where contest.id = new.contest_id;

  if expected_team_id is null or new.team_id <> expected_team_id then
    raise exception 'Contest player team must match the scheduled % team.', new.side
      using errcode = '23514';
  end if;

  select name into new.player_name from public.launch_players where id = new.player_id;
  select name into new.team_name from public.launch_teams where id = new.team_id;
  if new.player_name is null or new.team_name is null then
    raise exception 'Contest player and team must exist.' using errcode = '23503';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_launch_result_player_snapshots() from public;

create trigger launch_result_contest_player_snapshots
before insert or update on public.launch_result_contest_players
for each row execute function private.set_launch_result_player_snapshots();

alter table public.launch_result_contests enable row level security;
alter table public.launch_result_contest_players enable row level security;

grant select on public.launch_result_contests, public.launch_result_contest_players to anon, authenticated;
grant insert, update, delete on public.launch_result_contests, public.launch_result_contest_players to authenticated;

create policy "public reads published player contests"
on public.launch_result_contests for select to anon, authenticated
using (exists (
  select 1 from public.launch_match_results result
  where result.match_id = launch_result_contests.match_id and result.status = 'Published'
));

create policy "commissioners read draft player contests"
on public.launch_result_contests for select to authenticated
using ((select private.is_launch_commissioner()));

create policy "commissioners create draft player contests"
on public.launch_result_contests for insert to authenticated
with check (
  (select private.is_launch_commissioner())
  and exists (
    select 1 from public.launch_match_results result
    where result.match_id = launch_result_contests.match_id and result.status = 'Draft'
  )
);

create policy "commissioners update draft player contests"
on public.launch_result_contests for update to authenticated
using (
  (select private.is_launch_commissioner())
  and exists (
    select 1 from public.launch_match_results result
    where result.match_id = launch_result_contests.match_id and result.status = 'Draft'
  )
)
with check (
  (select private.is_launch_commissioner())
  and exists (
    select 1 from public.launch_match_results result
    where result.match_id = launch_result_contests.match_id and result.status = 'Draft'
  )
);

create policy "commissioners delete draft player contests"
on public.launch_result_contests for delete to authenticated
using (
  (select private.is_launch_commissioner())
  and exists (
    select 1 from public.launch_match_results result
    where result.match_id = launch_result_contests.match_id and result.status = 'Draft'
  )
);

create policy "public reads published contest players"
on public.launch_result_contest_players for select to anon, authenticated
using (exists (
  select 1
  from public.launch_result_contests contest
  join public.launch_match_results result on result.match_id = contest.match_id
  where contest.id = launch_result_contest_players.contest_id and result.status = 'Published'
));

create policy "commissioners read draft contest players"
on public.launch_result_contest_players for select to authenticated
using ((select private.is_launch_commissioner()));

create policy "commissioners create draft contest players"
on public.launch_result_contest_players for insert to authenticated
with check (
  (select private.is_launch_commissioner())
  and exists (
    select 1
    from public.launch_result_contests contest
    join public.launch_match_results result on result.match_id = contest.match_id
    where contest.id = launch_result_contest_players.contest_id and result.status = 'Draft'
  )
);

create policy "commissioners update draft contest players"
on public.launch_result_contest_players for update to authenticated
using (
  (select private.is_launch_commissioner())
  and exists (
    select 1
    from public.launch_result_contests contest
    join public.launch_match_results result on result.match_id = contest.match_id
    where contest.id = launch_result_contest_players.contest_id and result.status = 'Draft'
  )
)
with check (
  (select private.is_launch_commissioner())
  and exists (
    select 1
    from public.launch_result_contests contest
    join public.launch_match_results result on result.match_id = contest.match_id
    where contest.id = launch_result_contest_players.contest_id and result.status = 'Draft'
  )
);

create policy "commissioners delete draft contest players"
on public.launch_result_contest_players for delete to authenticated
using (
  (select private.is_launch_commissioner())
  and exists (
    select 1
    from public.launch_result_contests contest
    join public.launch_match_results result on result.match_id = contest.match_id
    where contest.id = launch_result_contest_players.contest_id and result.status = 'Draft'
  )
);
