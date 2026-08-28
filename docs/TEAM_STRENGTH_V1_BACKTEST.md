# Team Strength V1 backtest

## Purpose

Establish a regular-season prediction system that is explainable, stage-aware, and honest about what the historical archive actually contains.

Historical source: 42 team matches and 2,568 player-result facts across 2024-25 and 2025-26. There are 41 decided matches and one tie. Thirty-five matches are home-venue regular-season matches; 34 of those were decided.

## Important labeling correction

The archive stores who actually played each historical match, but it does **not** store exact point-in-time season roster snapshots or attendance snapshots. Earlier experiments that grouped the actual participants in a match were useful, but that pool is a proxy for **Match Lineup Strength**, not true **Active Roster Strength**.

To get a closer Active Roster Strength proxy, V1 reconstructs each team's season-wide roster from every player who appeared for that team during the season and carries each player's historical CI forward to the target match. That still is not a perfect point-in-time roster because membership timing is not preserved, so it remains explicitly a **season-roster proxy**.

This distinction matters and is now reflected in the code and labels.

## Historical checks

The first three rows validate roster-based public prediction stages or their closest historical proxies. The final two rows are known-matchup experiments retained for **post-match retrospective calibration only**; they are not public pre-match stages.

| Information / model | Regular season | All decided matches | Interpretation |
| --- | ---: | ---: | --- |
| Season-roster proxy, no home effect | 24 / 34 (70.6%) | 29 / 41 (70.7%) | Closest archive proxy for Active Roster Strength |
| **Season-roster proxy, +8 matchup home effect** | **27 / 34 (79.4%)** | **32 / 41 (78.0%)** | Early Active Roster proxy |
| **Actual participant pool 35/35/30, +8** | **30 / 34 (88.2%)** | **36 / 41 (87.8%)** | Match Lineup Strength proxy |
| **Actual singles matchups + pooled unknown doubles, +8** | **32 / 34 (94.1%)** | **38 / 41 (92.7%)** | Historical known-matchup calibration proxy |
| Actual singles + actual doubles pairings, +8 | 31 / 34 (91.2%) | 38 / 41 (92.7%) | Post-match actual-pair calibration check |

The +8 home effect remains meaningful. In the season-roster proxy it improves regular-season winner calls from 24/34 to 27/34. In the later known-matchup calibration experiment, removing home dropped the broader historical winner result from 38/41 to 34/41.

## Active Roster Strength

Active Roster Strength remains venue-neutral:

`0.35 × Top 6 Avg CI + 0.35 × Next 6 Avg CI + 0.30 × Depth Avg CI`

The current archive cannot provide an exact historical Active Roster backtest. The season-roster proxy is deliberately used as the nearest available validation and not presented as exact historical roster truth.

## Public prediction stages

1. **Active Roster Strength** — neutral full current season roster; +8 enters only in matchup prediction.
2. **Confirmed Available Roster Strength** — only explicit `Playing` responses. Historical attendance snapshots do not exist, so V1 uses the conservative Active Roster calibration until new data accumulates.
3. **Match Lineup Strength** — official locked participant pool. Historical actual participant pools provide a direct proxy for this stage. This is the final public pre-match stage.

## Post-match retrospective calibration

Actual singles opponents and doubles pairs are available only after play from recorded result contests. Retrospective analysis combines those actual pairings with the **frozen pre-match Match Lineup CI snapshot**; it never substitutes current CI.

The historical known-singles / pooled-doubles experiment produced the 32/34 regular-season winner result above and supports the known-matchup Expected Point Margin calibration. When actual doubles pairings exist, retrospective analysis uses the recorded pairs with the locked 80/20 rule.

These known-matchup models are calibration evidence, not additional public prediction stages.

## Guardrails

- Do not call an actual-participant backtest an Active Roster Strength backtest.
- Do not add home advantage to the stored strength value; apply it once in matchup prediction.
- Do not silently drop unrated players.
- Preserve match-time CI values and prediction inputs for future backtests.
- Do not expose known singles or doubles pairings as a pre-match stage.
- Refit each public stage only when the archive contains data for that stage.
- Playoffs remain outside the regular-season probability calibration.
