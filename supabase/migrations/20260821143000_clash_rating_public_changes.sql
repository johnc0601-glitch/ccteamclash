-- Public, read-only Clash Index movement for rankings.
-- This table contains only safe display data. The detailed event/ledger tables
-- remain commissioner-only and are never exposed through a definer view.

create table if not exists public.clash_rating_latest_changes (
  season_id text not null references public.launch_seasons(id) on delete cascade,
  player_id text not null references public.launch_players(id) on delete cascade,
  event_order integer not null,
  event_label text not null,
  rating_change integer not null,
  updated_at timestamptz not null default now(),
  primary key (season_id, player_id)
);

alter table public.clash_rating_latest_changes enable row level security;

revoke all on table public.clash_rating_latest_changes from public;
revoke all on table public.clash_rating_latest_changes from anon;
revoke all on table public.clash_rating_latest_changes from authenticated;

grant select on table public.clash_rating_latest_changes to anon, authenticated;

do $$ begin
  create policy "Public reads published Clash rating changes"
    on public.clash_rating_latest_changes
    for select
    to anon, authenticated
    using (
      exists (
        select 1
        from public.launch_seasons season
        where season.id = clash_rating_latest_changes.season_id
          and season.published = true
      )
    );
exception when duplicate_object then null; end $$;
