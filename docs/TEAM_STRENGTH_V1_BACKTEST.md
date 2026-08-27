# Team Strength V1 backtest

## Purpose

Establish a regular-season prediction system that is explainable, stage-aware, and honest about what the historical archive actually contains.

Historical source: 42 team matches and 2,568 player-result facts across 2024-25 and 2025-26. There are 41 decided matches and one tie. Thirty-five matches are home-venue regular-season matches; 34 of those were decided.

## Important labeling correction

The archive stores who actually played each historical match, but it does **not** store exact point-in-time season roster snapshots or attendance snapshots. Earlier experiments that grouped the actual participants in a match were useful, but that pool is a proxy for **Match Lineup Strength**, not true **Active Roster Strength**.

To get a closer Active Roster Strength proxy, V1 reconstructs each team's season-wide roster from every player who appeared for that team during the season and carries each player's historical CI forward to the target match. That still is not a perfect point-in-time roster because membership timing is not preserved, so it remains explicitly a **season-roster proxy**.

This distinction matters and is now reflected in the code and labels.

## Historical checks

| Information / model | Regular season | All decided matches | Interpretation |
| --- | ---: | ---: | --- |
| Season-roster proxy, no home effect | 24 / 34 (70.6%) | 29 / 41 (70.7%) | Closest archive proxy for Active Roster Strength |
| **Season-roster proxy, +8 matchup home effect** | **27 / 34 (79.4%)** | **32 / 41 (78.0%)** | Early Active Roster proxy |
| **Actual participant pool 35/35/30, +8** | **30 / 34 (88.2%)** | **36 / 41 (87.8%)** | Match Lineup Strength proxy |
| **Actual singles matchups + pooled unknown doubles, +8** | **32 / 34 (94.1%)** | **38 / 41 (92.7%)** | Best regular-season pre-pairing model |
| Actual singles + actual doubles pairings, +8 | 31 / 34 (91.2%) | 38 / 41 (92.7%) | Better score calibration; same all-match winner count |

The +8 home effect remains meaningful. In the season-roster proxy it improves regular-season winner calls from 24/34 to 27/34. In the later known-matchup model, removing home dropped the broader historical winner result from 38/41 to 34/41.

## Active Roster Strength

Active Roster Strength remains venue-neutral:

`0.35 × Top 6 Avg CI + 0.35 × Next 6 Avg CI + 0.30 × Depth Avg CI`

The current archive cannot provide an exact historical Active Roster backtest. The season-roster proxy is deliberately used as the nearest available validation and not presented as exact historical roster truth.

## Prediction stages

1. **Active Roster Strength** — neutral full current season roster; +8 enters only in matchup prediction.
2. **Confirmed Available Roster Strength** — only explicit `Playing` responses. Historical attendance snapshots do not exist, so V1 uses the conservative Active Roster calibration until new data accumulates.
3. **Match Lineup Strength** — official locked participant pool. Historical actual participant pools provide a direct proxy for this stage.
4. **Known singles / doubles unknown** — exact singles expectations plus deterministic pooled doubles expectations.
5. **Actual doubles known** — replace pooled doubles with actual 80/20 pair strengths.

## Guardrails

- Do not call an actual-participant backtest an Active Roster Strength backtest.
- Do not add home advantage to the stored strength value; apply it once in matchup prediction.
- Do not silently drop unrated players.
- Preserve match-time CI values and prediction inputs for future backtests.
- Refit each stage only when the archive contains data for that stage.
- Playoffs remain outside the regular-season probability calibration.
