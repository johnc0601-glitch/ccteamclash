drop function if exists public.captain_list_launch_free_agents();

create function public.captain_list_launch_free_agents()
returns table(
  application_id uuid,
  season_id text,
  player_id text,
  display_name text,
  player_name text,
  contact_email text,
  player_type text,
  gender text,
  pdga_number text,
  pdga_rating integer,
  clash_index integer,
  home_area text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.launch_profiles profile
    where profile.user_id = (select auth.uid())
      and profile.status = 'Approved'
      and profile.role in ('Captain', 'Commissioner')
  ) then
    raise exception 'Approved Captain or Commissioner access is required.' using errcode = '42501';
  end if;

  return query
  select application.id,
         application.season_id,
         linked_player.id,
         profile.display_name,
         coalesce(nullif(linked_player.name, ''), nullif(profile.display_name, ''), nullif(pdga_player.name, ''), 'Free Agent'),
         coalesce(auth_user.email::text, ''),
         application.player_type,
         application.gender,
         coalesce(
           nullif(linked_player.pdga_number, ''),
           nullif(pdga_player.pdga_number, ''),
           nullif(application.submitted_pdga_number, ''),
           ''
         ),
         coalesce(linked_player.pdga_rating, pdga_player.pdga_rating, application.submitted_pdga_rating),
         coalesce(linked_player.clash_index, pdga_player.clash_index),
         coalesce(nullif(linked_player.home_area, ''), nullif(pdga_player.home_area, ''), ''),
         application.created_at
  from public.launch_player_applications application
  join public.launch_profiles profile on profile.id = application.profile_id
  left join auth.users auth_user on auth_user.id = profile.user_id
  left join public.launch_players linked_player on linked_player.id = profile.player_id
  left join public.launch_players pdga_player
    on profile.player_id is null
   and nullif(btrim(application.submitted_pdga_number), '') is not null
   and btrim(pdga_player.pdga_number) = btrim(application.submitted_pdga_number)
  join public.launch_seasons season on season.id = application.season_id
  where application.status = 'Pending'
    and application.requested_team_id is null
    and profile.status in ('Pending', 'Approved')
    and season.active = true
    and season.published = true
    and season.archived = false
  order by application.created_at asc,
           coalesce(nullif(linked_player.name, ''), nullif(profile.display_name, ''), nullif(pdga_player.name, ''), 'Free Agent') asc;
end;
$$;

revoke all on function public.captain_list_launch_free_agents() from public, anon;
grant execute on function public.captain_list_launch_free_agents() to authenticated;
