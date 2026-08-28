# Team Strength V1 — scoring capacity and structural points

## Standard scoring base

A normal Clash starts from **36 standard points**:

- 18 singles points
- 18 doubles player-points

That 36-point base is the core match-scoring frame. Clash Index predicts ordinary contested performance; structural scoring remains a separate layer.

The official scoreboard can move away from a simple symmetric 36-point contest because league rules can create automatic points, bonus opportunities, penalties, or other adjustments.

## Structural scoring rules

Two effects are especially important:

1. **Short-handed automatic points.** If a team cannot fill the required 18-player structure, some standard points become automatic for the opponent rather than being ordinary CI-rated contests.
2. **Women bonus opportunities.** Extra female participation can create bonus-point opportunities when women play men. These are usually small — commonly one or two points — but a roster gender count alone does not prove the exact matchup structure or awarded points. A likely 1F-vs-2F structure can therefore create roughly two bonus opportunities, but V1 does not convert that roster fact directly into public expected points.

These are match-scoring effects, not Team Strength. They must never be baked into Active Roster Strength or Clash Index.

## Why the historical CI ledger differs from final scores

Clash Index player-result facts are intentionally a **player performance ledger**, not a complete copy of the final team scoreboard.

The historical workbooks contain rows such as `TRIPLES`, no-player/penalty rows and `Misc. Points`. The historical importer deliberately excludes those special rows from player CI history. That is correct for player rating, but it means summing player `actual_points` is not a safe way to reconstruct the official team result.

The 2025-26 source sheets also show asymmetric `Points Possible`, which is consistent with structural scoring rather than evidence that the standard base itself is not 36.

## Historical audit

For the 31 regular-season matches that already had official scores stored, 23 have a difference between the official score and the sum of rated player-result facts. The average absolute combined difference is about 3.39 points per match, with a maximum of 12 points.

Four February 2025-26 matches were missing official scores in the archive. Comparing their source scoreboards with the player-fact totals shows why official scores must remain the outcome source of truth:

- Dark Knights @ Ninjas — official **18-20**, rated-player facts **18-18**.
- KB @ Hayneous OG's — official **15.5-20.5**, rated-player facts match the official score.
- Cougar Country @ Beast Mode — official **12-24**, rated-player facts **11-18**.
- Riptide @ Wild Turkey — official **18-18**, rated-player facts **16-17**.

Two November 2025-26 schedule-summary values were also stale. The detailed scoreboards and season totals support **KB 27-9 Wild Turkey** and **Beast Mode 21.5-15.5 Hayneous OG's**.

## V1 modeling rule

Keep three concepts separate:

1. **Team Strength** — venue-neutral player quality.
2. **Public roster prediction** — Active Roster, Confirmed Available, then Match Lineup, with the +8 venue adjustment applied only in matchup prediction.
3. **Structural scoring** — automatic points, women bonus points, penalties, or another official scoring adjustment, kept separate from CI.

The public V1 forecast remains roster-based through Match Lineup Strength. It does not draft or infer exact singles/doubles matchups in order to create a fourth prediction stage.

For post-match retrospective analysis, ordinary completed contests can be replayed from frozen CI and actual recorded pairings. Official scores remain truth, so structural scoring is reconciled as:

`structural adjustment = official team score - actual points from complete CI-rated contests`

That residual is preserved without guessing a category the stored result facts cannot prove.

## Public stage behavior

- **Active Roster Strength** — no structural-point guessing. Roster shortfall/composition can remain diagnostic data.
- **Confirmed Available Roster Strength** — attendance narrows the player pool; shortfall/composition remain diagnostics rather than changing neutral Team Strength.
- **Match Lineup Strength** — final public pre-match stage. The locked participant pool sharpens the roster prediction, but the website does not draft or expose exact singles/doubles pairings.

There are no public Stage 4 or Stage 5 matchup predictions in V1.

## Post-match retrospective behavior

After the match:

- actual `ResultContest` singles opponents are evaluated using the two frozen Match Lineup CIs;
- actual doubles pairs use the locked **80/20** effective-CI rule;
- venue comes from the frozen prediction snapshot, so +8 is applied exactly once;
- official team scores reconcile structural scoring through the residual formula above;
- if a required frozen CI is missing or `null`, retrospective analysis remains unavailable rather than substituting a newer rating.

`calculateExpectedMatchPoints` remains a calibration/research helper for known matchup inputs. It is not the public pre-match prediction path.

## Guardrails

- Standard base remains 36.
- Never reduce Team Strength because a team is short-handed; structural scoring is separate.
- Never increase Team Strength because a roster has more women; bonus opportunities are match-specific.
- Do not infer structural points from historical player-count differences alone.
- Never infer a historical winner from rating-fact totals when an official team score exists.
- Home advantage remains a separate +8 CI matchup effect and is applied exactly once.
- Actual singles/doubles pairings are post-match retrospective data only.
