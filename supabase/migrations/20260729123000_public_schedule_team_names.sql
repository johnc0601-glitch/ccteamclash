grant select on public.launch_teams to anon;

create policy "public reads active launch teams"
on public.launch_teams for select to anon
using (active = true);
