-- Ensure every brand-new active roster player has a numeric CI before Matchday
-- snapshot capture. MatchdaySnapshotAdapter treats a null active-player CI as an
-- invariant failure, so silently leaving these players unrated can break future
-- match rating snapshots.
--
-- Scope is deliberately narrow:
--   * current active + published season only;
--   * active roster memberships only;
--   * no PDGA rating (PDGA-seeded players are handled by the existing trigger);
--   * Male/Female only so division seed is unambiguous;
--   * no historical matchups, current CI facts, or frozen CI snapshots.
--
-- This also repairs untouched legacy ghost baselines (850 Open / 725 Women)
-- that predate the current season-start baselines (825 Open / 700 Women).
-- Established or already-played provisional players are never rewritten.

select set_config('app.clash_rating_engine_write', 'on', true);

with active_season as (
  select id
  from public.launch_seasons
  where active = true
    and published = true
  order by year desc
  limit 1
), eligible as (
  select
    p.id,
    case when p.gender = 'Female' then 700 else 825 end as seed_ci
  from public.launch_season_roster_memberships m
  join active_season s on s.id = m.season_id
  join public.launch_players p on p.id = m.player_id
  where m.status = 'Active'
    and p.pdga_rating is null
    and p.gender in ('Male', 'Female')
    and (
      p.clash_index is null
      or (
        p.clash_index_provisional = true
        and (
          (p.gender = 'Male' and p.clash_index = 850)
          or (p.gender = 'Female' and p.clash_index = 725)
        )
      )
    )
    and not exists (
      select 1
      from public.historical_player_matchups h
      where h.player_id = p.id
    )
    and not exists (
      select 1
      from public.clash_contest_rating_facts f
      where f.player_id = p.id
    )
    and not exists (
      select 1
      from public.clash_match_rating_snapshots snapshot
      where snapshot.player_id = p.id
    )
)
update public.launch_players p
set clash_index = eligible.seed_ci,
    clash_index_provisional = true,
    updated_at = now()
from eligible
where p.id = eligible.id
  and (
    p.clash_index is distinct from eligible.seed_ci
    or p.clash_index_provisional is distinct from true
  );

select set_config('app.clash_rating_engine_write', 'off', true);
