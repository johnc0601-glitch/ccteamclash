# Historical matchup dry-run import

This importer treats the consolidated matchup sheets as the authoritative source for match detail:

- 2024–2025: `24-25 All Matchups`
- 2025–2026: `Combined Matchup Results`

`Player Record` is used only as supporting season-roster data so player and opponent teams can be attached to each detailed row. Its aggregate records do not create matchup history.

The first run is read-only. It emits normalized JSON plus review queues and performs no database writes. Identity resolution accepts exact canonical names and entries in `scripts/historical_player_aliases.json` only. It never performs fuzzy or display-name similarity matching.

For the 2024–2025 workbook, which has no partner column, a doubles partner is inferred only when exactly two same-team rows in the same event have the same opponent pair and result. All other cases remain in the review report.

Run with the project's existing Python spreadsheet runtime:

```powershell
python scripts/historical_matchup_import.py `
  --workbook-24-25 "path/to/2024-2025.xlsx" `
  --workbook-25-26 "path/to/2025-2026.xlsx" `
  --output "tmp/historical-matchup-dry-run.json"
```

## Database migration and controlled import

The migration is `supabase/migrations/20260731120000_historical_player_matchups.sql`. It uses one immutable source-backed row per player appearance. Opponents use explicit foreign-key columns rather than an array so every participant retains a permanent-player reference. Display-name and team-name snapshots preserve the historical presentation if canonical names change later.

```sql
-- See supabase/migrations/20260731120000_historical_player_matchups.sql
```

The text foreign keys match the permanent IDs currently used by the launch season, team, player, and player-history services.

The importer remains read-only by design. A reviewed clean payload can be generated separately for a controlled, conflict-safe database import; excluded rows remain in the dry-run review report.

## Review gates before an import

1. Review every unresolved or ambiguous identity and add only verified aliases.
2. Resolve malformed rows, penalties, missing opponents, and legacy partner exceptions.
3. Confirm historical result/score semantics. The public history should show W/L/T until then.
4. Re-run and require zero duplicates and zero blocking invalid rows.
5. Apply only the reviewed clean payload through an explicitly approved database operation.
