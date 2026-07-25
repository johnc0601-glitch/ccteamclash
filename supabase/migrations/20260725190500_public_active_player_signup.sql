grant select on public.launch_players to anon;

drop policy if exists "launch public read active players" on public.launch_players;
create policy "launch public read active players"
on public.launch_players
for select
to anon
using (active = true);
