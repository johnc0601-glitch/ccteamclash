grant insert, update on public.launch_players to authenticated;

drop policy if exists "launch commissioners read players" on public.launch_players;
create policy "launch commissioners read players"
on public.launch_players
for select
to authenticated
using (private.is_launch_commissioner());

drop policy if exists "launch commissioners create players" on public.launch_players;
create policy "launch commissioners create players"
on public.launch_players
for insert
to authenticated
with check (private.is_launch_commissioner());

drop policy if exists "launch commissioners update players" on public.launch_players;
create policy "launch commissioners update players"
on public.launch_players
for update
to authenticated
using (private.is_launch_commissioner())
with check (private.is_launch_commissioner());
