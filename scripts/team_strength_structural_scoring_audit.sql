-- Team Strength V1 structural-scoring audit.
--
-- Run only after the staged historical team-score corrections are applied.
-- Official team scores are outcome truth. Player fact totals are the CI-rated
-- contest ledger and intentionally omit some structural scoring rows.

with team_side as (
  select
    h.id as match_id,
    h.season_name,
    h.event_order,
    h.event_label,
    h.away_team_name,
    h.home_team_name,
    side.team_name,
    case
      when side.team_name = h.away_team_name then h.away_score
      else h.home_score
    end::numeric as official_points,
    count(distinct f.player_id) as player_count,
    count(distinct f.player_id) filter (where p.gender = 'Female') as female_player_count,
    sum(f.actual_points)::numeric as rated_player_points
  from public.historical_team_matches h
  cross join lateral (
    values (h.away_team_name), (h.home_team_name)
  ) side(team_name)
  left join public.historical_clash_contest_rating_facts f
    on f.historical_team_match_id = h.id
   and f.team_name = side.team_name
  left join public.launch_players p
    on p.id = f.player_id
  where h.ci_venue = 'Home'
    and h.away_score is not null
    and h.home_score is not null
  group by
    h.id,
    h.season_name,
    h.event_order,
    h.event_label,
    h.away_team_name,
    h.home_team_name,
    side.team_name,
    h.away_score,
    h.home_score
), paired as (
  select
    team.*,
    opponent.player_count as opponent_player_count,
    opponent.female_player_count as opponent_female_player_count,
    greatest(0, 18 - team.player_count) as standard_player_shortfall,
    greatest(0, 18 - opponent.player_count) as opponent_standard_player_shortfall,
    2 * greatest(0, 18 - opponent.player_count) as estimated_automatic_points,
    greatest(0, team.female_player_count - opponent.female_player_count) as extra_female_count,
    2 * greatest(0, team.female_player_count - opponent.female_player_count)
      as women_bonus_opportunity_count
  from team_side team
  join team_side opponent
    on opponent.match_id = team.match_id
   and opponent.team_name <> team.team_name
)
select
  season_name,
  event_order,
  event_label,
  away_team_name,
  home_team_name,
  team_name,
  player_count,
  opponent_player_count,
  female_player_count,
  opponent_female_player_count,
  standard_player_shortfall,
  opponent_standard_player_shortfall,
  estimated_automatic_points,
  extra_female_count,
  women_bonus_opportunity_count,
  rated_player_points,
  official_points,
  official_points - rated_player_points as scoreboard_minus_rated_points,
  official_points - rated_player_points - estimated_automatic_points
    as residual_after_estimated_automatic_points
from paired
order by season_name, event_order, match_id, team_name;
