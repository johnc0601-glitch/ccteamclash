create policy "public reads historical team matches"
on public.historical_team_matches
for select
to anon, authenticated
using (true);
