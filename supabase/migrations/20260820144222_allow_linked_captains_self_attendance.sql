create or replace function private.is_launch_player(player_id text)
returns boolean
language sql
stable
security definer
set search_path to 'public', 'private'
set row_security to 'off'
as $function$
  select exists (
    select 1
    from public.launch_profiles profile
    where profile.user_id = auth.uid()
      and profile.player_id = is_launch_player.player_id
      and profile.status = 'Approved'
      and profile.role in ('Player', 'Captain', 'Commissioner')
  );
$function$;
