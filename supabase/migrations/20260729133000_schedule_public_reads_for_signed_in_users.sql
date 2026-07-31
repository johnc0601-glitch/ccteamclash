drop policy if exists "public reads published launch seasons" on public.launch_seasons;
create policy "public reads published launch seasons"
on public.launch_seasons for select to anon, authenticated
using (published = true and archived = false);

drop policy if exists "public reads active launch courses" on public.launch_courses;
create policy "public reads active launch courses"
on public.launch_courses for select to anon, authenticated
using (active = true);

drop policy if exists "public reads published launch schedules" on public.launch_schedules;
create policy "public reads published launch schedules"
on public.launch_schedules for select to anon, authenticated
using (published = true);

drop policy if exists "public reads published launch rounds" on public.launch_rounds;
create policy "public reads published launch rounds"
on public.launch_rounds for select to anon, authenticated
using (
  published = true
  and exists (
    select 1 from public.launch_schedules schedule
    where schedule.id = launch_rounds.schedule_id and schedule.published = true
  )
);

drop policy if exists "public reads published launch schedule matches" on public.launch_schedule_matches;
create policy "public reads published launch schedule matches"
on public.launch_schedule_matches for select to anon, authenticated
using (
  exists (
    select 1
    from public.launch_rounds round
    join public.launch_schedules schedule on schedule.id = round.schedule_id
    where round.id = launch_schedule_matches.round_id
      and round.published = true
      and schedule.published = true
  )
);
