-- Initial Clash Pulse podcast research readers, requested by the league commissioner.
-- Resolve approved, linked profiles by exact human-readable names rather than
-- environment-specific generated profile IDs.
-- Staging has no matching accounts: leave it unseeded.
-- If some but not all accounts match, fail rather than grant the wrong profile.
do $$
declare
  matching_count integer;
  eligible_count integer;
begin
  select count(*) into matching_count
    from public.launch_profiles
    where display_name in ('Justin Kent', 'Phil Hood', 'Philip Murray');

  if matching_count = 0 then
    raise notice 'No named reader accounts in this environment; no grants created.';
    return;
  end if;

  select count(*) into eligible_count
    from public.launch_profiles
    where display_name in ('Justin Kent', 'Phil Hood', 'Philip Murray')
      and user_id is not null
      and status = 'Approved'
      and role <> 'Commissioner';

  if matching_count <> 3 or eligible_count <> 3 then
    raise exception 'Expected three unique, approved, linked Clash Pulse readers; found % matching and % eligible', matching_count, eligible_count;
  end if;

  insert into public.clash_pulse_readers (profile_id)
  select id from public.launch_profiles
    where display_name in ('Justin Kent', 'Phil Hood', 'Philip Murray')
      and user_id is not null and status = 'Approved'
      and role <> 'Commissioner'
  on conflict (profile_id) do nothing;
end $$;
