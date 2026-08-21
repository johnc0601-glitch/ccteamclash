-- Freeze each player's first rating state for a season so corrections and
-- rebuilds never depend on a later/live PDGA rating.

create table if not exists public.clash_rating_season_starts (
  season_id text not null references public.launch_seasons(id) on delete cascade,
  player_id text not null references public.launch_players(id) on delete cascade,
  algorithm_version text not null references public.clash_rating_versions(id),
  rating integer not null,
  rated_results integer not null default 0,
  provisional_events integer not null default 0,
  provisional boolean not null default false,
  captured_at timestamptz not null default now(),
  primary key (season_id, player_id, algorithm_version)
);

create index if not exists clash_rating_season_starts_player_idx
  on public.clash_rating_season_starts (player_id, season_id);

alter table public.clash_rating_season_starts enable row level security;

do $$ begin
  create policy "Commissioners manage Clash season starts"
    on public.clash_rating_season_starts for all to authenticated
    using (private.is_launch_commissioner())
    with check (private.is_launch_commissioner());
exception when duplicate_object then null; end $$;

revoke all on public.clash_rating_season_starts from anon;
grant select, insert, update, delete on public.clash_rating_season_starts to authenticated;

create or replace function private.capture_clash_rating_season_start()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.clash_rating_season_starts (
    season_id,
    player_id,
    algorithm_version,
    rating,
    rated_results,
    provisional_events,
    provisional,
    captured_at
  ) values (
    new.season_id,
    new.player_id,
    new.algorithm_version,
    round(new.rating_before)::integer,
    new.rated_results_before,
    new.provisional_events_before,
    new.provisional_before,
    now()
  )
  on conflict (season_id, player_id, algorithm_version) do nothing;

  return new;
end;
$$;

revoke all on function private.capture_clash_rating_season_start() from public;

drop trigger if exists capture_clash_rating_season_start_after_event_player
  on public.clash_rating_event_players;
create trigger capture_clash_rating_season_start_after_event_player
  after insert on public.clash_rating_event_players
  for each row
  execute function private.capture_clash_rating_season_start();
