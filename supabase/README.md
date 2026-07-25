# Supabase

This folder holds the local Phase 1 database foundation.

`schema/phase1_launch.sql` is intentionally a plain schema file, not a generated migration. The Supabase CLI is not installed in this workspace yet, so the first real migration should be generated from this SQL once the project is linked.

Runtime setup uses:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Phase 1 uses 8 namespaced tables. The `launch_` prefix avoids colliding with older empty league tables already present in the Team Clash Supabase project.

- `launch_profiles`
- `launch_player_claims`
- `launch_players`
- `launch_teams`
- `launch_events`
- `launch_event_rosters`
- `launch_event_roster_players`
- `launch_event_posts`
