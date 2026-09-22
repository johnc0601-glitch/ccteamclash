create index if not exists launch_clubhouse_reads_season_idx
on public.launch_clubhouse_reads(season_id);

create index if not exists launch_clubhouse_reads_team_idx
on public.launch_clubhouse_reads(team_id);
