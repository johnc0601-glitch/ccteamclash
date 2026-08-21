-- Clash Rating persistence layer.
-- The official result tables remain the source of truth. These tables store
-- reproducible rating calculations, event snapshots, and rebuild metadata.

create table if not exists public.clash_rating_versions (
  id text primary key,
  expectation_divisor double precision not null,
  upset_exponent double precision not null,
  min_movement double precision not null,
  max_movement double precision not null,
  home_advantage double precision not null,
  doubles_strong_weight double precision not null,
  doubles_weak_weight double precision not null,
  open_provisional_start integer not null,
  women_provisional_start integer not null,
  provisional_event_1_multiplier double precision not null,
  provisional_event_2_multiplier double precision not null,
  provisional_event_3_multiplier double precision not null,
  provisional_min_events integer not null,
  provisional_min_results integer not null,
  created_at timestamptz not null default now(),
  constraint clash_rating_versions_weights_check
    check (abs((doubles_strong_weight + doubles_weak_weight) - 1.0) < 0.000001)
);

insert into public.clash_rating_versions (
  id,
  expectation_divisor,
  upset_exponent,
  min_movement,
  max_movement,
  home_advantage,
  doubles_strong_weight,
  doubles_weak_weight,
  open_provisional_start,
  women_provisional_start,
  provisional_event_1_multiplier,
  provisional_event_2_multiplier,
  provisional_event_3_multiplier,
  provisional_min_events,
  provisional_min_results
) values (
  'cr-2026-v1',
  100,
  1.8,
  2,
  28,
  15,
  0.80,
  0.20,
  850,
  725,
  1.60,
  1.30,
  1.15,
  3,
  4
)
on conflict (id) do nothing;

create table if not exists public.clash_rating_runs (
  id uuid primary key default gen_random_uuid(),
  season_id text not null references public.launch_seasons(id) on delete cascade,
  algorithm_version text not null references public.clash_rating_versions(id),
  starting_event_order integer not null default 1,
  source text not null check (source in ('HistoricalBackfill', 'CurrentSeason', 'CorrectionRebuild')),
  status text not null default 'Running' check (status in ('Running', 'Completed', 'Failed')),
  reason text,
  rows_written integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  error_message text
);

create table if not exists public.clash_rating_event_players (
  season_id text not null references public.launch_seasons(id) on delete cascade,
  event_key text not null,
  event_order integer not null,
  event_label text not null,
  player_id text not null references public.launch_players(id) on delete cascade,
  algorithm_version text not null references public.clash_rating_versions(id),
  rating_before double precision not null,
  singles_delta double precision not null default 0,
  doubles_delta double precision not null default 0,
  provisional_adjustment double precision not null default 0,
  rating_after double precision not null,
  rated_results_before integer not null default 0,
  rated_results_after integer not null default 0,
  provisional_events_before integer not null default 0,
  provisional_events_after integer not null default 0,
  provisional_before boolean not null default false,
  provisional_after boolean not null default false,
  run_id uuid references public.clash_rating_runs(id) on delete set null,
  calculated_at timestamptz not null default now(),
  primary key (season_id, event_key, player_id)
);

create table if not exists public.clash_rating_ledger (
  id bigint generated always as identity primary key,
  season_id text not null references public.launch_seasons(id) on delete cascade,
  event_key text not null,
  event_order integer not null,
  event_label text not null,
  source_type text not null check (source_type in ('Historical', 'Current')),
  source_key text not null,
  source_contest_id text,
  player_id text not null references public.launch_players(id) on delete cascade,
  format text not null check (format in ('Singles', 'Doubles')),
  side text not null check (side in ('Home', 'Away')),
  outcome text not null check (outcome in ('W', 'L', 'T')),
  rating_before double precision not null,
  partner_player_id text references public.launch_players(id) on delete set null,
  partner_rating double precision,
  opponent_one_player_id text references public.launch_players(id) on delete set null,
  opponent_one_rating double precision,
  opponent_two_player_id text references public.launch_players(id) on delete set null,
  opponent_two_rating double precision,
  own_pair_rating double precision,
  opponent_pair_rating double precision,
  home_adjustment double precision not null default 0,
  expected_score double precision not null,
  actual_score double precision not null,
  competitive_delta double precision not null,
  provisional_multiplier double precision not null default 1,
  provisional_adjustment double precision not null default 0,
  total_delta double precision not null,
  algorithm_version text not null references public.clash_rating_versions(id),
  run_id uuid references public.clash_rating_runs(id) on delete set null,
  calculated_at timestamptz not null default now(),
  constraint clash_rating_ledger_expected_check check (expected_score >= 0 and expected_score <= 1),
  constraint clash_rating_ledger_actual_check check (actual_score in (0, 0.5, 1)),
  unique (season_id, event_key, source_key, player_id)
);

create index if not exists clash_rating_runs_season_idx
  on public.clash_rating_runs (season_id, started_at desc);
create index if not exists clash_rating_event_players_player_idx
  on public.clash_rating_event_players (player_id, season_id, event_order);
create index if not exists clash_rating_event_players_event_idx
  on public.clash_rating_event_players (season_id, event_order);
create index if not exists clash_rating_ledger_player_idx
  on public.clash_rating_ledger (player_id, season_id, event_order);
create index if not exists clash_rating_ledger_event_idx
  on public.clash_rating_ledger (season_id, event_order, format);
create index if not exists clash_rating_ledger_opponent_one_idx
  on public.clash_rating_ledger (opponent_one_player_id, season_id)
  where opponent_one_player_id is not null;

alter table public.clash_rating_versions enable row level security;
alter table public.clash_rating_runs enable row level security;
alter table public.clash_rating_event_players enable row level security;
alter table public.clash_rating_ledger enable row level security;

-- Internal first: approved commissioners may read and write the audit tables.
-- Player-facing history can later be exposed through a read-only view without
-- weakening the write policies on the underlying ledger.
do $$ begin
  create policy "Commissioners read Clash rating versions"
    on public.clash_rating_versions for select to authenticated
    using (private.is_launch_commissioner());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Commissioners manage Clash rating versions"
    on public.clash_rating_versions for all to authenticated
    using (private.is_launch_commissioner())
    with check (private.is_launch_commissioner());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Commissioners manage Clash rating runs"
    on public.clash_rating_runs for all to authenticated
    using (private.is_launch_commissioner())
    with check (private.is_launch_commissioner());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Commissioners manage Clash event ratings"
    on public.clash_rating_event_players for all to authenticated
    using (private.is_launch_commissioner())
    with check (private.is_launch_commissioner());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Commissioners manage Clash rating ledger"
    on public.clash_rating_ledger for all to authenticated
    using (private.is_launch_commissioner())
    with check (private.is_launch_commissioner());
exception when duplicate_object then null; end $$;
