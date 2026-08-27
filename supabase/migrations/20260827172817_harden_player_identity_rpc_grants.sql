revoke all on function public.captain_review_launch_player_application(uuid, text, text, text) from public, anon;
grant execute on function public.captain_review_launch_player_application(uuid, text, text, text) to authenticated;

revoke all on function public.captain_update_rostered_player_registration(text, text, text, text, boolean) from public, anon;
grant execute on function public.captain_update_rostered_player_registration(text, text, text, text, boolean) to authenticated;

revoke all on function public.commissioner_route_player_to_captain(text, text, text, text) from public, anon;
grant execute on function public.commissioner_route_player_to_captain(text, text, text, text) to authenticated;

revoke all on function public.submit_launch_player_application(text, text, text, text, boolean) from public, anon;
grant execute on function public.submit_launch_player_application(text, text, text, text, boolean) to authenticated;
