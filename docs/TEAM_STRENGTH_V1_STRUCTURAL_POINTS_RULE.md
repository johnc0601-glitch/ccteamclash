# Team Strength V1 — structural points rule

## Standard match

A normal Clash starts from **36 standard points**:

- 18 singles points
- 18 doubles player-points

Each required player therefore represents two standard points across the normal round: one singles point and one doubles player-point.

Team Strength predicts ordinary contested points from Clash Index.

## Structural points are separate

Two league rules can alter how the scoreboard is reached without changing a team's intrinsic strength:

1. **Automatic points from a short-handed opponent.** When a locked team cannot fill the required 18-player structure, each missing required player exposes two standard points to the opponent: one singles point and one doubles player-point. Those points are structural/automatic, not CI-rated contests.
2. **Women bonus opportunities.** Extra female participation can create women-vs-men bonus opportunities. In the standard singles+doubles structure, one additional female relative to the opponent can create two bonus opportunities during the round. A 2F-vs-1F structure therefore exposes two opportunities to the team with the additional female.

A women bonus **opportunity is not automatically an expected or awarded point**. The actual award remains outcome-dependent, so V1 keeps opportunity count separate until the triggering matchup can be evaluated.

These effects belong at the match layer, not inside Active Roster Strength and not inside Clash Index.

## V1 prediction behavior

- **Active Roster Strength:** predict the normal 36-point match. Do not guess women bonus points or automatic points from the broad season roster.
- **Confirmed Available Roster Strength:** still an early estimate. Roster composition and the raw shortfall from 18 are captured for analysis. Automatic points should enter the score only when the short-handed condition is sufficiently certain.
- **Match Lineup Strength:** once the participation structure is locked, deterministic automatic points can be included. Women bonus **opportunity count** can also be known from the female-count differential, but it is not converted blindly into expected points.
- **Known singles/doubles:** predict ordinary rated contests from CI, add deterministic automatic points, and add women bonus expected points only when matchup-level information supports an expectation.

## Code contract

`calculateExpectedMatchPoints` keeps three quantities distinct:

- rated-contest expected points,
- structural point components,
- final expected team score / expected margin.

Structural components are explicit inputs. V1 recognizes:

- `automaticPoints`
- `womenBonusExpectedPoints`
- `otherKnownPoints`

`StructuralScoring.ts` separately exposes:

- player shortfall from 18,
- deterministic automatic points caused by the opponent's shortfall,
- extra-female count,
- women bonus opportunity count.

The women field is deliberately called **expected** points in the final score model because opportunity count and awarded points are not the same thing.

## Guardrails

- Standard base remains 36 even when some standard points become automatic.
- Do not lower Team Strength because a team is short; apply the consequence through automatic scoring instead.
- Do not raise Team Strength because a roster contains more women; women bonus opportunities are match-specific scoring structure.
- Do not automatically convert two women bonus opportunities into two expected points.
- Do not infer structural points from raw player-count differences in the historical archive when exact lineup structure is unavailable.
- Home advantage remains the separate +8 CI matchup effect and is applied only once.
