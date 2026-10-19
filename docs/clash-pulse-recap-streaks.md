# Monthly recap simplification and streaks

The recap library now follows Generate → Copy Round Facts. Approval/status labels and approval, hide, and homepage feature controls have been removed from this library. The existing homepage publishing tools remain separate. Stored legacy review fields are retained for compatibility, without a database migration.

The report adds team winning, losing, unbeaten and winless runs and each player's separate singles/doubles appearance runs. It reports both runs continuing through the selected round and runs ended that round, naming the opponent and ending outcome. Runs need at least two qualifying results. Ties interrupt winning/losing runs and continue unbeaten/winless runs.

Coverage is the selected season through the selected round, explicitly stated in the copied report. Older archives do not yet establish exhaustive cross-season streaks. Published team scores support team runs; player runs require the same locked-snapshot and frozen-rating reconciliation as other player facts. Absences and unplayed awards are not appearances. Missing/draft/inconsistent records and ambiguous same-round dates interrupt runs. After an unknown result, lengths say “at least” rather than claiming an exact beginning. Later rounds and other seasons cannot inflate a selected round's runs.

Generation loads earlier rounds in the season. Earlier-round queue requests or regeneration after a later report started require that later report to refresh before copying, preventing stale streaks after corrections.

Validation: 18 Pulse tests, 5 result workflow tests, and 18 final-scoreboard tests pass. Targeted ESLint passes. Production build passes with existing unrelated HEIC, staging podcast-table and UDisc cache warnings. Signed-in local staging preview verified Generate → Copy, the Streaks filter, explicit Round 1 empty state, source coverage note, and export without pending-review labels. No production data changes are part of this follow-up.

Screenshot: `docs/evidence/clash-pulse-recap-staging.jpg`.
