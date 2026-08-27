# Chance of Victory calibration — Team Strength V1

## Scope

This calibration is for the **regular-season** prediction model. Playoff probabilities are intentionally left separate so playoff coverage can later use richer lineup/scenario analysis without changing the regular-season model.

The input is the model's **Expected Point Margin**:

`team expected points - opponent expected points`

A positive margin favors the team being evaluated. A zero margin is forced to 50%.

## Historical fit

The calibration used the 35 historical home-venue regular-season matches in the current archive. One match was tied, leaving **34 decided regular-season matches** for the binary win-probability fit.

The underlying expected-points model uses:

- match-time CI values only;
- the +8 CI home effect in the matchup layer;
- actual singles matchups when known;
- pooled plausible doubles pairings using the 80/20 stronger/weaker CI rule when doubles teams are unknown.

A symmetric one-parameter logistic curve was fit to expected point margin. The fitted slope was approximately **0.426**, rounded to **0.43** for V1:

`Chance of Victory = 1 / (1 + exp(-0.43 * Expected Point Margin))`

The symmetry constraint is deliberate: if the teams have the same expected score, each side starts at 50%. Home advantage is already represented upstream by the +8 matchup adjustment and must not be added again here.

## V1 probability cap

Regular-season V1 caps the displayed probability at **95% / 5%**.

This is a guardrail, not a claim that a 95% favorite has exactly a 5% upset rate. The historical sample is small, and the archive contains a major upset where the expected-points model strongly favored Riptide but Wild Turkey won 17-16. Leave-one-out checks showed that capping extreme probabilities reduced overconfidence and improved robustness.

## Display curve

| Expected point margin | Chance of Victory |
| ---: | ---: |
| 0.0 | 50% |
| +0.5 | 55% |
| +1.0 | 61% |
| +1.5 | 66% |
| +2.0 | 70% |
| +2.5 | 75% |
| +3.0 | 78% |
| +4.0 | 85% |
| +5.0 | 90% |
| +6.0 | 93% |
| +7.0 or more | 95% cap |

Negative margins are symmetric. For example, -2.0 corresponds to about 30%.

## Backtest context

The selected expected-points model predicted **38 of 41 decided historical matches (92.7%)** when actual singles matchups were known and doubles pairings were hidden/pooled. Using actual doubles pairings produced the same 38-of-41 winner count, although exact pairings improved projected-score calibration.

The +8 home effect remained important: the comparable hybrid model fell from 38/41 to 34/41 when the home effect was removed.

## Guardrails

- Do not call this curve for playoffs in V1.
- Do not add home advantage inside this probability function; it is already reflected in Expected Point Margin.
- Do not use today's CI values to reconstruct old predictions. Preserve match-time inputs/snapshots.
- Treat 50–95% as an estimate of expected outcome, not certainty.
- Refit after each season as the archive grows; do not silently change the slope or cap without recording a new model version/calibration note.
