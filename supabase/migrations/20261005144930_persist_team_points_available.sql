alter table public.launch_match_results
  add column if not exists home_base_points_available integer,
  add column if not exists away_base_points_available integer,
  add column if not exists home_gender_bonus_available integer,
  add column if not exists away_gender_bonus_available integer,
  add column if not exists home_points_available integer,
  add column if not exists away_points_available integer;

alter table public.launch_match_results
  drop constraint if exists launch_match_results_home_points_available_nonnegative,
  add constraint launch_match_results_home_points_available_nonnegative
    check (home_points_available is null or home_points_available >= 0),
  drop constraint if exists launch_match_results_away_points_available_nonnegative,
  add constraint launch_match_results_away_points_available_nonnegative
    check (away_points_available is null or away_points_available >= 0),
  drop constraint if exists launch_match_results_home_points_available_consistent,
  add constraint launch_match_results_home_points_available_consistent
    check (
      home_points_available is null
      or (
        home_base_points_available is not null
        and home_gender_bonus_available is not null
        and home_points_available = home_base_points_available + home_gender_bonus_available
      )
    ),
  drop constraint if exists launch_match_results_away_points_available_consistent,
  add constraint launch_match_results_away_points_available_consistent
    check (
      away_points_available is null
      or (
        away_base_points_available is not null
        and away_gender_bonus_available is not null
        and away_points_available = away_base_points_available + away_gender_bonus_available
      )
    );

with contest_counts as (
  select
    contest.match_id,
    contest.id as contest_id,
    count(player.player_id) filter (where player.side = 'Home')::integer as home_filled,
    count(player.player_id) filter (where player.side = 'Away')::integer as away_filled,
    count(player.player_id) filter (
      where player.side = 'Home' and launch_player.gender = 'Female'
    )::integer as home_female,
    count(player.player_id) filter (
      where player.side = 'Away' and launch_player.gender = 'Female'
    )::integer as away_female,
    count(player.player_id) filter (
      where player.side = 'Home' and launch_player.gender = 'Male'
    )::integer as home_male,
    count(player.player_id) filter (
      where player.side = 'Away' and launch_player.gender = 'Male'
    )::integer as away_male
  from public.launch_result_contests contest
  left join public.launch_result_contest_players player
    on player.contest_id = contest.id
  left join public.launch_players launch_player
    on launch_player.id = player.player_id
  group by contest.match_id, contest.id
),
match_availability as (
  select
    match_id,
    coalesce(sum(home_filled), 0)::integer as home_base,
    coalesce(sum(away_filled), 0)::integer as away_base,
    coalesce(sum(least(greatest(home_female - away_female, 0), away_male)), 0)::integer as home_bonus,
    coalesce(sum(least(greatest(away_female - home_female, 0), home_male)), 0)::integer as away_bonus
  from contest_counts
  group by match_id
)
update public.launch_match_results result
set
  home_base_points_available = availability.home_base,
  away_base_points_available = availability.away_base,
  home_gender_bonus_available = availability.home_bonus,
  away_gender_bonus_available = availability.away_bonus,
  home_points_available = availability.home_base + availability.home_bonus,
  away_points_available = availability.away_base + availability.away_bonus,
  updated_at = greatest(result.updated_at, now())
from match_availability availability
where result.match_id = availability.match_id;

update public.launch_match_results
set
  home_base_points_available = coalesce(home_score + away_score, 0)::integer,
  away_base_points_available = coalesce(home_score + away_score, 0)::integer,
  home_gender_bonus_available = 0,
  away_gender_bonus_available = 0,
  home_points_available = coalesce(home_score + away_score, 0)::integer,
  away_points_available = coalesce(home_score + away_score, 0)::integer
where status = 'Published'
  and (home_points_available is null or away_points_available is null);

alter table public.launch_match_results
  drop constraint if exists launch_match_results_published_points_available,
  add constraint launch_match_results_published_points_available
    check (
      status = 'Draft'
      or (
        home_base_points_available is not null
        and away_base_points_available is not null
        and home_gender_bonus_available is not null
        and away_gender_bonus_available is not null
        and home_points_available is not null
        and away_points_available is not null
      )
    );

comment on column public.launch_match_results.home_points_available is
  'Immutable home-team scoring opportunities captured from the loaded scoreboard at finalization: filled player slots plus gender bonus opportunities.';
comment on column public.launch_match_results.away_points_available is
  'Immutable away-team scoring opportunities captured from the loaded scoreboard at finalization: filled player slots plus gender bonus opportunities.';
