-- Historical Clash rating inputs and official season-end snapshots.
-- These tables already exist in production from the rating rebuild; this
-- migration makes fresh branches and future environments reproducible.

create table if not exists public.clash_rating_historical_seeds (
  season_id text not null,
  player_name text not null,
  rating integer not null check (rating > 0),
  source text not null,
  created_at timestamptz not null default now(),
  primary key (season_id, player_name, source)
);

create table if not exists public.clash_rating_season_snapshots (
  season_id text not null,
  player_id text not null,
  player_name text not null,
  rating integer not null,
  rated_results integer not null default 0,
  provisional boolean not null default false,
  start_source text not null,
  algorithm_version text not null,
  calculated_at timestamptz not null default now(),
  primary key (season_id, player_id, algorithm_version)
);

create index if not exists clash_rating_season_snapshots_player_idx
  on public.clash_rating_season_snapshots (player_id, season_id);

alter table public.clash_rating_historical_seeds enable row level security;
alter table public.clash_rating_season_snapshots enable row level security;

-- Historical inputs and official snapshots are commissioner-readable.
-- Public rankings read only the narrow latest-change view introduced later.
do $$ begin
  create policy "Commissioners read Clash historical seeds"
    on public.clash_rating_historical_seeds for select to authenticated
    using (private.is_launch_commissioner());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Commissioners manage Clash historical seeds"
    on public.clash_rating_historical_seeds for all to authenticated
    using (private.is_launch_commissioner())
    with check (private.is_launch_commissioner());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Commissioners read Clash season snapshots"
    on public.clash_rating_season_snapshots for select to authenticated
    using (private.is_launch_commissioner());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Commissioners manage Clash season snapshots"
    on public.clash_rating_season_snapshots for all to authenticated
    using (private.is_launch_commissioner())
    with check (private.is_launch_commissioner());
exception when duplicate_object then null; end $$;
