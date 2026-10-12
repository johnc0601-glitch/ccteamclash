create policy "commissioners read CI publication ledger"
  on public.clash_match_publications
  for select
  to authenticated
  using ((select private.is_launch_commissioner()));