# Supabase

This folder holds the local Phase 1 database foundation.

`schema/phase1_launch.sql` is intentionally a plain schema file, not a generated migration. The Supabase CLI is not installed in this workspace yet, so the first real migration should be generated from this SQL once the project is linked.

Runtime setup uses:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Phase 1 uses 8 tables:

- `profiles`
- `player_claims`
- `players`
- `teams`
- `events`
- `event_rosters`
- `event_roster_players`
- `event_posts`
