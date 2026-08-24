revoke all on function public.captain_confirm_unlocked_match_roster(text, text) from public;
revoke all on function public.captain_confirm_unlocked_match_roster(text, text) from anon;
grant execute on function public.captain_confirm_unlocked_match_roster(text, text) to authenticated;

revoke all on function public.captain_save_unlocked_match_roster(text, text, jsonb) from public;
revoke all on function public.captain_save_unlocked_match_roster(text, text, jsonb) from anon;
grant execute on function public.captain_save_unlocked_match_roster(text, text, jsonb) to authenticated;
