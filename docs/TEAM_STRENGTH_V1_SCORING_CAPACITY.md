# Team Strength V1 — scoring capacity and automatic points

## Why this matters

Clash Index player-result facts are intentionally a **player performance ledger**, not a complete copy of the final team scoreboard.

The historical workbooks contain scoring rows that are not normal rated player contests, including `TRIPLES`, no-player/penalty rows and other `Misc. Points`. The historical matchup importer deliberately classifies those markers as penalty rows and excludes them from player CI history. That is correct for player rating, but it means summing player `actual_points` is not a safe way to reconstruct the official team result.

The 2025-26 source sheets also show that `Points Possible` can differ between the two teams in the same match. A future expected-score model therefore cannot assume every Clash is a fixed, symmetric 18-singles / 9-doubles / 36-point game.

## Historical audit

For the 31 regular-season matches that already had official scores stored, 23 have a difference between the official score and the sum of rated player-result facts. The average absolute combined difference is about 3.39 points per match, with a maximum of 12 points.

Those differences did not change the recorded winner in those 31 matches, but that does **not** make them ignorable. Four February 2025-26 matches were missing official scores in the archive. Comparing their source scoreboards with the player-fact totals shows that two of the four would have the wrong team outcome if the result were reconstructed only from rating facts:

- Dark Knights @ Ninjas — official **18-20**, rated-player facts **18-18**.
- KB @ Hayneous OG's — official **15.5-20.5**, rated-player facts match the official score.
- Cougar Country @ Beast Mode — official **12-24**, rated-player facts **11-18**.
- Riptide @ Wild Turkey — official **18-18**, rated-player facts **16-17**.

The official team scoreboard must therefore be the outcome source of truth for Team Strength calibration.

## V1 modeling rule

Keep two layers separate:

1. **Rated contest expectation** — singles and ordinary doubles that can be evaluated from CI.
2. **Known score adjustments / capacity effects** — automatic points, penalties, triples or other league-rule effects that change the team scoreboard without being an ordinary rated contest.

Do not invent the second layer from roster size alone. Until the current-season rule is encoded and tested, early public forecasts continue to use calibrated roster-strength probabilities.

When a known scoring adjustment is available from an authoritative lineup/scoring rules engine, `calculateExpectedMatchPoints` can add that adjustment to the rated-contest expectation before converting expected margin to Chance of Victory.

## Stage behavior

- **Active Roster Strength** — no scoring-capacity assumption. Early estimate only.
- **Confirmed Available Roster Strength** — attendance narrows the player pool, but V1 still does not fabricate penalty or triples points from headcount. Early estimate only.
- **Match Lineup Strength** — uses the locked participant pool and its calibrated participant-stage curve. It still does not pretend the exact singles/doubles/triples arrangement is known.
- **Known singles / ordinary doubles unknown** — use rated-contest Expected Points. Add only scoring adjustments that are explicitly known.
- **Actual ordinary doubles known** — replace pooled doubles with actual 80/20 pair strengths.
- **Triples / special scoring rows** — keep outside the ordinary 80/20 doubles calculation until the league rule is explicitly modeled.

## Calibration guardrail

Never infer a historical match winner by summing `historical_clash_contest_rating_facts.actual_points` when an official team score exists. Rating facts are appropriate for CI calibration; official team scores are appropriate for Team Strength outcome calibration.
