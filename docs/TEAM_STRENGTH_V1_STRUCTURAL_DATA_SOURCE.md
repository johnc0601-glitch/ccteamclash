# Team Strength V1 — structural scoring data source

## What the current site already stores

The results subsystem already has exact contest assignments:

- `launch_result_contests` identifies Singles/Doubles and contest position.
- `launch_result_contest_players` identifies Home/Away player slots.

That is enough to count the exact standard singles and doubles player-slots represented in a completed contest layout.

## Why it is not wired directly into the pre-match forecast yet

The same contest tables are used by the mutable **Draft result editor**. `ResultsService.saveDraft()` can save any valid subset of contests and does not require a complete 18-singles / 9-doubles layout until a later workflow supplies the rest.

Therefore the mere absence of a player slot in a Draft cannot safely mean “automatic point.” It may only mean the commissioner/captain has not finished entering the contests yet.

V1 must not mistake data-entry progress for a competitive disadvantage.

## Safe rule

Automatic points may be calculated from contest assignments only after a separate signal establishes that the matchup/contest layout is finalized.

`ContestStructuralScoring.ts` now enforces that contract:

- `auditContestPlayerSlots()` can inspect any contest set without changing a prediction.
- `exactAutomaticPointsFromFinalizedContestLayout(contests, false)` returns no structural adjustment.
- only `layoutFinalized=true` permits missing singles/doubles player-slots to become automatic points.

This is intentionally separate from result publication. A future pre-match matchup-builder could finalize assignments before play without publishing a result.

## Current V1 behavior

Until a trustworthy pre-match “layout finalized” signal exists:

- Active Roster and Confirmed Available remain roster-stage forecasts.
- Match Lineup uses the locked participant pool but does not invent exact automatic points from unique-player count.
- raw shortfall from 18 and female composition are captured in immutable prediction snapshots.
- women bonus opportunity counts can be identified from lineup composition, but they are not blindly converted to expected points.

## Future extension

The cleanest future workflow is a small immutable **match structure lock** containing:

- finalized singles assignments;
- finalized doubles assignments;
- explicit automatic slots;
- the female-vs-male bonus-triggering assignments.

When that exists, Team Strength can move from Match Lineup Strength to the known-matchup Expected Points model before play begins, without using result-entry data or leaking post-match information.
