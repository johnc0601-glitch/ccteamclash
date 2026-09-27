grant execute on function private.current_launch_profile_id() to authenticated;
comment on function private.current_launch_profile_id() is
  'RLS helper: returns only the authenticated caller''s approved launch profile ID.';
