# Minimal current-season player Results dependency

## Goal

Persist official current-season player contests beneath the existing `launch_match_results` record so production player history no longer depends on `MockStatisticsRepository`. The parent Match Result remains the publication authority; this adds no second result lifecycle.

## Tables

### `launch_result_contests`

One row per singles pairing or doubles pairing:

- `id text primary key`
- `match_id text not null references launch_match_results(match_id) on delete cascade`
- `format text not null check (format in ('Singles', 'Doubles'))`
- `position integer not null check (position > 0)`
- `home_outcome text not null check (home_outcome in ('W', 'L', 'T'))`
- `away_outcome text not null check (away_outcome in ('W', 'L', 'T'))`
- `home_score integer null check (home_score >= 0)`
- `away_score integer null check (away_score >= 0)`
- timestamps
- unique `(match_id, format, position)`

Validation rules:

- Home and away outcomes must be complementary: W/L, L/W, or T/T.
- Published singles require both numeric scores. Their outcome must agree with the scores.
- Doubles scores remain null in v1; W/L/T is authoritative.

### `launch_result_contest_players`

One permanent player assignment per contest position:

- `contest_id text not null references launch_result_contests(id) on delete cascade`
- `player_id text not null references launch_players(id) on delete restrict`
- `team_id text not null references launch_teams(id) on delete restrict`
- `side text not null check (side in ('Home', 'Away'))`
- `slot integer not null check (slot in (1, 2))`
- player/team display snapshots for historical presentation
- timestamps
- primary key `(contest_id, side, slot)`
- unique `(contest_id, player_id)`

Singles must have exactly one player on each side. Doubles must have exactly two players on each side. A doubles partner is the other player on the same contest and side; opponents are the players on the opposite side. No relationship table is needed.

## Publication lifecycle

- Contest and participant rows may be created or edited while the parent `launch_match_results.status` is `Draft`.
- Publishing the parent result validates every contest and makes all child rows publicly readable and immutable.
- Reopening the parent result immediately removes its child rows from public history and permits commissioner edits.
- Republishing validates the full set again and restores public visibility.
- Child rows have no independent draft/published status.

## Service changes

1. Extend `ResultsService` draft and publish validation to include contests and participant assignments.
2. Add a Supabase repository query joining published match results, schedule matches, contests, and contest players.
3. Map that query to the existing `ChallengeResult`/`PlayerMatchHistoryEntry` business shape.
4. Replace `MockStatisticsRepository` in server-side production player-history requests with the Supabase repository.
5. Keep `PlayerMatchHistoryService` responsible for combining canonical current rows with imported historical rows.

## Migration impact

- Two new tables, foreign keys, validation checks, and indexes on `match_id`, `contest_id`, and `player_id`.
- RLS mirrors Results: commissioners manage draft children; public and ordinary authenticated users read children only when the parent result is Published.
- Generated Supabase types change for both tables.
- Existing team-level results remain valid. No backfill is possible unless detailed player pairings exist outside the current mocks.

## Replacing mock data

The current mock challenge/player rows should remain test fixtures only. Production construction must instantiate a Supabase statistics/history repository. Once official current player contests are entered, the mock repository is removed from production service wiring without changing card components or display formatting.

## Estimated effort

- Migration, RLS, and generated types: 0.5 day
- Results repository/service entry and publication validation: 1 day
- Supabase statistics/history query and service wiring: 0.5 day
- Integration, permission, lifecycle, and regression tests: 0.5–1 day

Estimated total: 2.5–3 working days.
