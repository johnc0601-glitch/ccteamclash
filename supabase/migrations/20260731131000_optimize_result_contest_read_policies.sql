drop policy "public reads published player contests" on public.launch_result_contests;
drop policy "commissioners read draft player contests" on public.launch_result_contests;
drop policy "public reads published contest players" on public.launch_result_contest_players;
drop policy "commissioners read draft contest players" on public.launch_result_contest_players;

create policy "anonymous reads published player contests"
on public.launch_result_contests for select to anon
using (exists (
  select 1 from public.launch_match_results result
  where result.match_id = launch_result_contests.match_id and result.status = 'Published'
));

create policy "authenticated reads permitted player contests"
on public.launch_result_contests for select to authenticated
using (
  (select private.is_launch_commissioner())
  or exists (
    select 1 from public.launch_match_results result
    where result.match_id = launch_result_contests.match_id and result.status = 'Published'
  )
);

create policy "anonymous reads published contest players"
on public.launch_result_contest_players for select to anon
using (exists (
  select 1
  from public.launch_result_contests contest
  join public.launch_match_results result on result.match_id = contest.match_id
  where contest.id = launch_result_contest_players.contest_id and result.status = 'Published'
));

create policy "authenticated reads permitted contest players"
on public.launch_result_contest_players for select to authenticated
using (
  (select private.is_launch_commissioner())
  or exists (
    select 1
    from public.launch_result_contests contest
    join public.launch_match_results result on result.match_id = contest.match_id
    where contest.id = launch_result_contest_players.contest_id and result.status = 'Published'
  )
);
