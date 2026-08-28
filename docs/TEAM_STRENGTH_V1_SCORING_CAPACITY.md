# Team Strength V1 — scoring capacity and structural points

## Standard scoring base

A normal Clash starts from **36 standard points**:

- 18 singles points
- 18 doubles player-points

That 36-point base is the core expected-points model. Clash Index predicts the genuinely contested portions of those points.

The scoreboard can still move away from a simple symmetric 36-point contest because league rules can create structural points or bonus opportunities.

## Structural scoring rules

Two effects are especially important:

1. **Short-handed automatic points.** If a team cannot fill the required 18-player structure, some standard points become automatic for the opponent rather than being CI-rated contests.
2. **Women bonus opportunities.** Extra female participation can create bonus-point opportunities when women play men. These are usually small — commonly one or two points — and are difficult to predict until availability or the lineup is sufficiently clear. A likely 1F-vs-2F structure can therefore create roughly two bonus-point opportunities during the round, but V1 does not assume that structure early.

These are match-scoring effects, not Team Strength. They must never be baked into Active Roster Strength or Clash Index.

## Why the historical CI ledger differs from final scores

Clash Index player-result facts are intentionally a **player performance ledger**, not a complete copy of the final team scoreboard.

The historical workbooks contain rows such as `TRIPLES`, no-player/penalty rows and `Misc. Points`. The historical importer deliberately excludes those special rows from player CI history. That is correct for player rating, but it means summing player `actual_points` is not a safe way to reconstruct the official team result.

The 2025-26 source sheets also show asymmetric `Points Possible`, which is consistent with the structural rules above rather than evidence that the standard base itself is not 36.

## Historical audit

For the 31 regular-season matches that already had official scores stored, 23 have a difference between the official score and the sum of rated player-result facts. The average absolute combined difference is about 3.39 points per match, with a maximum of 12 points.

Four February 2025-26 matches were missing official scores in the archive. Comparing their source scoreboards with the player-fact totals shows why official scores must remain the outcome source of truth:

- Dark Knights @ Ninjas — official **18-20**, rated-player facts **18-18**.
- KB @ Hayneous OG's — official **15.5-20.5**, rated-player facts match the official score.
- Cougar Country @ Beast Mode — official **12-24**, rated-player facts **11-18**.
- Riptide @ Wild Turkey — official **18-18**, rated-player facts **16-17**.

Two November 2025-26 schedule-summary values were also stale. The detailed scoreboards and season totals support **KB 27-9 Wild Turkey** and **Beast Mode 21.5-15.5 Hayneous OG's**.

## V1 modeling rule

Keep three layers separate:

1. **Team Strength** — neutral player quality.
2. **Rated contest expectation** — ordinary singles and doubles evaluated from CI, with the +8 home matchup effect applied once.
3. **Structural points** — automatic short-handed points, expected women bonus points, or another explicitly known scoring adjustment.

The final prediction is:

`rated expected points + structural points = expected team score`

Then:

`team expected score - opponent expected score = Expected Point Margin`

Expected Point Margin is converted to Chance of Victory using the regular-season calibration.

## Stage behavior

- **Active Roster Strength** — model the normal 36-point match. Do not guess structural points.
- **Confirmed Available Roster Strength** — attendance narrows the player pool. If a short-handed condition is certain, deterministic automatic points may be introduced; otherwise remain conservative.
- **Match Lineup Strength** — the 18-player participation structure is known, so automatic points can be included when the rule requires them. Women bonus points are still included only when the triggering matchup structure is sufficiently known.
- **Known singles / ordinary doubles unknown** — calculate rated Expected Points and add only explicit structural-point components.
- **Actual ordinary doubles known** — replace pooled doubles with actual 80/20 pair strengths.

## Code contract

`calculateExpectedMatchPoints` exposes structural effects explicitly:

- `automaticPoints`
- `womenBonusExpectedPoints`
- `otherKnownPoints`

The women field is intentionally an **expected** point value rather than a guaranteed point value. If the matchup only creates an opportunity, the scoring layer can assign an expectation without pretending the point is already won.

## Guardrails

- Standard base remains 36.
- Never reduce Team Strength because a team is short-handed; apply the scoring consequence through automatic points.
- Never increase Team Strength because a roster has more women; bonus opportunities are match-specific.
- Do not infer structural points from historical player-count differences. The relationship is real but mixes multiple Clash rules.
- Never infer a historical winner from rating-fact totals when an official team score exists.
- Home advantage remains a separate +8 CI matchup effect and is applied exactly once.
