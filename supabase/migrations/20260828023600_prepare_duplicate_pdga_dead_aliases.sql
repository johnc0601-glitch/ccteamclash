do $$
begin
  if exists (
    with duplicate_pdga as (
      select btrim(pdga_number) as pdga_number
      from public.launch_players
      where nullif(btrim(pdga_number), '') is not null
      group by btrim(pdga_number)
      having count(*) > 1
    ), evidence as (
      select p.id, btrim(p.pdga_number) as pdga_number,
        (p.active
         or exists (select 1 from public.launch_profiles profile where profile.player_id = p.id)
         or exists (
           select 1
           from public.launch_season_roster_memberships membership
           where membership.player_id = p.id
             and membership.status <> 'Dropped'
         )
         or exists (select 1 from public.launch_result_contest_players result_player where result_player.player_id = p.id)
         or exists (select 1 from public.historical_player_matchups historical where historical.player_id = p.id)) as has_identity_evidence
      from public.launch_players p
      join duplicate_pdga duplicate on duplicate.pdga_number = btrim(p.pdga_number)
    )
    select 1
    from evidence
    group by pdga_number
    having count(*) filter (where has_identity_evidence) <> 1
  ) then
    raise exception 'Duplicate PDGA identities still require manual resolution before dead aliases can be cleaned.';
  end if;
end;
$$;

select set_config('app.captain_registration_write', 'on', true);
with duplicate_pdga as (
  select btrim(pdga_number) as pdga_number
  from public.launch_players
  where nullif(btrim(pdga_number), '') is not null
  group by btrim(pdga_number)
  having count(*) > 1
), evidence as (
  select p.id, btrim(p.pdga_number) as pdga_number,
    (p.active
     or exists (select 1 from public.launch_profiles profile where profile.player_id = p.id)
     or exists (
       select 1
       from public.launch_season_roster_memberships membership
       where membership.player_id = p.id
         and membership.status <> 'Dropped'
     )
     or exists (select 1 from public.launch_result_contest_players result_player where result_player.player_id = p.id)
     or exists (select 1 from public.historical_player_matchups historical where historical.player_id = p.id)) as has_identity_evidence
  from public.launch_players p
  join duplicate_pdga duplicate on duplicate.pdga_number = btrim(p.pdga_number)
)
update public.launch_players player
set pdga_number = '', updated_at = clock_timestamp()
from evidence
where player.id = evidence.id
  and evidence.has_identity_evidence = false;
select set_config('app.captain_registration_write', 'off', true);
