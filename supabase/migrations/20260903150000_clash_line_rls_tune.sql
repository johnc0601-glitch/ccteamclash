drop policy if exists "commissioners manage clash line" on public.clash_line_items;

drop policy if exists "commissioners publish clash line" on public.clash_line_items;
create policy "commissioners publish clash line"
on public.clash_line_items for insert
to authenticated
with check ((select private.is_launch_commissioner()));

drop policy if exists "commissioners update clash line" on public.clash_line_items;
create policy "commissioners update clash line"
on public.clash_line_items for update
to authenticated
using ((select private.is_launch_commissioner()))
with check ((select private.is_launch_commissioner()));

drop policy if exists "commissioners remove clash line" on public.clash_line_items;
create policy "commissioners remove clash line"
on public.clash_line_items for delete
to authenticated
using ((select private.is_launch_commissioner()));
