# Team Strength V1 — structural points rule

## Standard match

A normal Clash starts from **36 standard points**:

- 18 singles points
- 18 doubles player-points

Team Strength predicts those ordinary contested points from Clash Index.

## Structural points are separate

Two league rules can alter how the scoreboard is reached without changing a team's intrinsic strength:

1. **Automatic points from a short-handed opponent.** When a team cannot fill the required 18-player structure, some standard points become automatic rather than CI-rated contests.
2. **Women bonus opportunities.** Extra female participation can create additional bonus-point opportunities when women play men. These are usually small — often one or two points — and are difficult to know before availability/lineups are clear.

These effects belong at the match layer, not inside Active Roster Strength and not inside Clash Index.

## V1 prediction behavior

- **Active Roster Strength:** predict the normal 36-point match. Do not guess women bonus points or automatic points from roster composition alone.
- **Confirmed Available Roster Strength:** still an early estimate. If a short-handed condition is already certain, the scoring rules engine may provide deterministic automatic points. Women bonus points remain unmodeled unless the matchup structure is sufficiently known.
- **Match Lineup Strength:** once the 18-player participation structure is locked, deterministic automatic points can be included. Women bonus opportunities can be included only when the actual rule-triggering matchup is known.
- **Known singles/doubles:** predict ordinary rated contests from CI and then add explicit structural-point components.

## Code contract

`calculateExpectedMatchPoints` must keep three quantities distinct:

- rated-contest expected points,
- structural point components,
- final expected team score / expected margin.

Structural components are explicit inputs, never inferred silently. V1 recognizes:

- `automaticPoints`
- `womenBonusExpectedPoints`
- `otherKnownPoints`

The women field is deliberately called **expected** points because the bonus opportunity may be known while the awarded point is still outcome-dependent.

## Guardrails

- Standard base remains 36 even when some standard points become automatic.
- Do not lower team strength because a team is short; apply the consequence through automatic scoring instead.
- Do not raise team strength because a roster contains more women; women bonus opportunities are match-specific scoring structure.
- Do not infer structural points from raw player-count differences in the historical archive. That correlation is real but mixes several rule effects.
- Home advantage remains the separate +8 CI matchup effect and is applied only once.
