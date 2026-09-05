create table if not exists public.launch_league_settings (
  league_id text primary key references public.launch_leagues(id) on delete cascade,
  matchup_prediction_visibility text not null default 'Public'
    check (matchup_prediction_visibility in ('Public', 'CaptainsCommissioner', 'Commissioner')),
  updated_by_profile_id text null references public.launch_profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.launch_league_settings (
  league_id,
  matchup_prediction_visibility
) values (
  'cc-team-clash',
  'Public'
)
on conflict (league_id) do nothing;

alter table public.launch_league_settings enable row level security;

grant select on public.launch_league_settings to anon, authenticated, service_role;
grant insert, update on public.launch_league_settings to authenticated, service_role;

drop policy if exists "league settings are publicly readable" on public.launch_league_settings;
create policy "league settings are publicly readable"
on public.launch_league_settings
for select
to anon, authenticated
using (true);

drop policy if exists "commissioners insert league settings" on public.launch_league_settings;
create policy "commissioners insert league settings"
on public.launch_league_settings
for insert
to authenticated
with check (private.is_launch_commissioner());

drop policy if exists "commissioners update league settings" on public.launch_league_settings;
create policy "commissioners update league settings"
on public.launch_league_settings
for update
to authenticated
using (private.is_launch_commissioner())
with check (private.is_launch_commissioner());
