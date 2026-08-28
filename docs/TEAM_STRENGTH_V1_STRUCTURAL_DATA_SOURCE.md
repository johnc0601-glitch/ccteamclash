# Team Strength V1 — structural scoring data source

## What the site already stores

The results subsystem already has the post-match contest assignments needed for retrospective analysis:

- `launch_result_contests` identifies Singles/Doubles, contest position and result.
- `launch_result_contest_players` identifies the actual Home/Away players and doubles pairs.
- the published team score is the official scoring truth.

Captains draft singles and doubles in person on event day. The website does **not** need a separate pre-match matchup-builder or match-structure lock.

## Public pre-match behavior

The public forecast stops at **Match Lineup Strength**. It stays roster-based through all three stages:

1. Active Roster Strength
2. Confirmed Available Roster Strength
3. Match Lineup Strength

Raw shortfall from 18 and gender composition may be captured as structural diagnostics, but V1 does not upgrade the public forecast to exact singles/doubles pairings.

## Post-match retrospective data source

After a result is final, actual `ResultContest` assignments provide the real singles opponents and doubles pairs. `RetrospectiveMatchAnalysis.ts` combines those assignments with the frozen Match Lineup player-CI snapshot.

A complete ordinary contest is CI-rated retrospectively:

- Singles uses the two frozen player CIs.
- Doubles uses the actual pair on each side with the locked **80/20** effective-CI rule.
- venue comes from the frozen pre-match snapshot, so the +8 home effect is not reconstructed later.

If a required frozen CI is missing or explicitly `null`, the retrospective analysis is unavailable for that contest set. V1 never substitutes a newer CI.

## Structural scoring rule

Incomplete result slots are not forced into the CI-rated layer. They may represent automatic/forfeit scoring or another structural condition.

V1 reconciles structural scoring from the official score:

`structural adjustment = official team score - actual points from complete CI-rated contests`

That residual can include automatic points, women bonus points, penalties, or another official Clash scoring adjustment. V1 preserves the effect without guessing a category the stored result data cannot prove.

`ContestStructuralScoring.ts` remains a low-level slot-audit utility, but no pre-match match-structure repository is required.

## Guardrails

- Result contests are post-match retrospective data, not a public prediction input.
- Official team scores are the truth for match outcomes and structural reconciliation.
- Structural scoring never changes Team Strength or Clash Index.
- Do not infer exact women bonus awards from roster gender counts alone.
- Do not use current player CI in a historical replay.
