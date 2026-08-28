# Team Strength V1 — structural points rule

## Standard match

A normal Clash starts from **36 standard points**:

- 18 singles points
- 18 doubles player-points

Each required player therefore represents two standard points across the normal round: one singles point and one doubles player-point.

Team Strength predicts ordinary competitive strength from Clash Index. Structural scoring is a separate match layer.

## Structural points are separate

Official scoring can differ from the sum of ordinary CI-rated contest points because of effects such as:

1. **Automatic points from a short-handed opponent.** A team short of the required 18-player structure creates automatic scoring for the opponent.
2. **Women bonus opportunities.** Extra female participation can create bonus opportunities; for example a 2F-vs-1F structure can expose roughly two opportunities across the normal singles+doubles structure.
3. **Penalties or other official adjustments.** These must remain separate from player strength.

A women bonus **opportunity is not automatically an expected or awarded point**. V1 does not convert roster gender counts directly into bonus points.

These effects belong at the match layer, not inside Active Roster Strength, Match Lineup Strength, or Clash Index.

## Public pre-match behavior

The public V1 forecast remains roster-based through its final stage:

- **Active Roster Strength:** no structural point guessing.
- **Confirmed Available Roster Strength:** no structural point guessing; shortfall and composition can be retained as diagnostics.
- **Match Lineup Strength:** final public pre-match stage. The locked participant pool sharpens the roster-strength prediction, but the website does not draft or expose exact singles/doubles pairings.

Structurally obvious shortfall remains useful data, but it does not change the neutral Team Strength number. V1 keeps the public probability model simple and calibrates structural effects separately.

## Post-match retrospective behavior

After play, actual `ResultContest` assignments identify the real complete CI-rated singles and doubles contests. The retrospective model uses frozen Match Lineup CI for those contests.

The official team score is then used to reconcile everything outside the ordinary rated layer:

`structural adjustment = official team score - actual points from complete CI-rated contests`

That residual can contain automatic points, women bonus points, penalties, or another special scoring effect. V1 preserves the official effect without pretending the data proves which category caused every point.

## Code contract

`RetrospectiveMatchAnalysis.ts` keeps these quantities distinct:

- CI-rated expected points from actual recorded matchups;
- CI-rated actual points from complete recorded contests;
- official structural adjustment;
- final retrospective expected score / expected margin.

`StructuralScoring.ts` and `ContestStructuralScoring.ts` remain low-level utilities for shortfall, opportunity and slot audits. They do not alter roster strength.

## Guardrails

- Standard base remains 36 before structural scoring effects.
- Do not lower Team Strength because a team is short; apply the consequence through structural scoring.
- Do not raise Team Strength because a roster contains more women.
- Do not automatically convert women bonus opportunities into expected points.
- Do not infer historical structural points from player-count differences when the official scoring facts are available.
- Home advantage remains the separate +8 CI matchup effect and is applied only once.
- Official team scores are the truth for match outcomes.
