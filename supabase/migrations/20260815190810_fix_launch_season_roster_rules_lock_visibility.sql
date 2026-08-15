-- Trigger-driven lock persistence must observe schedule rows written earlier in
-- the current statement. VOLATILE gives each invocation a fresh command
-- snapshot while preserving the helper's signature, body, search path, owner,
-- and existing EXECUTE grants.
alter function private.launch_season_roster_rules_lock_at(text) volatile;
