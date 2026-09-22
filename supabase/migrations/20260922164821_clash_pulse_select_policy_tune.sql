drop policy if exists "public reads active clash pulse" on public.clash_pulse_items;
drop policy if exists "commissioners read all clash pulse" on public.clash_pulse_items;

create policy "anon reads active clash pulse"
on public.clash_pulse_items
for select
to anon
using (
  is_active
  and (expires_at is null or expires_at > now())
);

create policy "authenticated reads clash pulse"
on public.clash_pulse_items
for select
to authenticated
using (
  (
    is_active
    and (expires_at is null or expires_at > now())
  )
  or (select private.is_launch_commissioner())
);
