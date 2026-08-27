# Team Strength V1 backtest

## Purpose

Establish a regular-season prediction model that is explainable, cheap to run, and does not pretend we know doubles pairings before captains publish them.

Historical source: 42 team matches and 2,568 player-result facts across the 2024-25 and 2025-26 seasons. There are 41 decided matches and one tie.

## V1 decisions

- **Active Roster Strength is venue-neutral.**
- Active Roster Strength remains **35% Top 6 + 35% Next 6 + 30% Depth**.
- **Home advantage is +8 CI only in the matchup prediction layer.**
- Regular-season doubles strength uses the established **80/20 stronger/weaker CI rule**.
- Before doubles teams are known, do **not** invent pairings and do **not** use Monte Carlo. Average the expected result across every plausible doubles pair in each known player pool.
- Once actual doubles teams are locked, replace the pooled estimate with the real pair strengths.

## Historical checks

| Model | Correct winner | Accuracy | Point-share MAE | Point-share Brier |
| --- | ---: | ---: | ---: | ---: |
| Active Roster Strength, no home effect | 34 / 41 | 82.9% | 0.07546 | 0.009345 |
| Active Roster Strength, +8 matchup home effect | 36 / 41 | 87.8% | ~0.07066 | 0.007914 |
| Player pools, singles and doubles pairings both unknown, +8 | 36 / 41 | 87.8% | 0.07731 | 0.008529 |
| **Actual singles matchups + pooled unknown doubles, +8** | **38 / 41** | **92.7%** | 0.07433 | 0.008126 |
| Actual singles matchups + pooled unknown doubles, no home effect | 34 / 41 | 82.9% | 0.08135 | 0.010078 |
| Actual singles + actual doubles pairings, +8 | 38 / 41 | 92.7% | 0.06926 | 0.007303 |

The important result is the fourth row: hiding the actual doubles pairings did **not** reduce historical winner accuracy once the singles matchups were known. Exact doubles pairings improved score calibration, but the winner count stayed 38/41.

The +8 home effect also remains important in the hybrid expected-points model: 38/41 with it versus 34/41 without it.

## Regular-season prediction stages

1. **Active roster stage** — compare neutral Active Roster Strength values; apply +8 only for the home team inside the matchup prediction.
2. **Player/lineup information improves** — calculate expected singles points from known matchups.
3. **Doubles still unknown** — calculate pooled doubles expected points across plausible 80/20 pair strengths.
4. **Doubles locked** — replace the pooled doubles estimate with actual 80/20 pair strengths.

This keeps the regular-season model deterministic and easy to explain while allowing prediction quality to improve as real lineup information arrives.

## Guardrails

- These results are a historical backtest on a small sample, not an independent future-season validation set.
- Do not convert small differences in expected points into overconfident win percentages yet. Calibrate Expected Margin -> Chance of Victory separately.
- Preserve match-time CI values and lineup inputs for future backtests; never recalculate historical predictions using today's ratings.
- Real upsets remain possible. One historical match was predicted by the pooled model as a large Riptide advantage but ended in a 16-17 loss to Wild Turkey. The model should represent expected outcomes, not certainty.
