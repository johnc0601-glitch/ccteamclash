drop policy if exists "authorized users create pre-lock match attendance"
on public.launch_match_attendance;

drop policy if exists "authorized users delete pre-lock match attendance"
on public.launch_match_attendance;

drop policy if exists "authorized users update pre-lock match attendance"
on public.launch_match_attendance;


drop policy if exists "captains and commissioners manage pre-lock match rosters"
on public.launch_match_rosters;

drop policy if exists "captains commissioners create rosters"
on public.launch_match_rosters;

drop policy if exists "captains commissioners update rosters"
on public.launch_match_rosters;