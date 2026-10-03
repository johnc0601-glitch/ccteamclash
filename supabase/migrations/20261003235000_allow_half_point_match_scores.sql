alter table public.launch_match_results
  alter column home_score type numeric(5,1) using home_score::numeric(5,1),
  alter column away_score type numeric(5,1) using away_score::numeric(5,1);

alter table public.launch_match_results
  drop constraint if exists launch_match_results_home_half_point_check,
  drop constraint if exists launch_match_results_away_half_point_check;

alter table public.launch_match_results
  add constraint launch_match_results_home_half_point_check
    check (home_score is null or mod(home_score * 2, 1) = 0),
  add constraint launch_match_results_away_half_point_check
    check (away_score is null or mod(away_score * 2, 1) = 0);
