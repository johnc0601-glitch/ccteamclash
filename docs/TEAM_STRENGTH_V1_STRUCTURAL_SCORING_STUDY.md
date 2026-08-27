# Team Strength V1 — structural scoring study

## Why this study exists

The historical rating ledger and the official team scoreboard do not always total to the same number. That is expected: Clash Index tracks ordinary rated player contests, while the Clash scoreboard also reflects structural league rules.

The commissioner clarified the two primary rules:

- the standard match starts from **36 points / 18 required players**;
- a missing required player turns that player's standard points into automatic points for the opponent;
- extra female participation can create bonus opportunities when women play men, commonly a small one- or two-point effect in normal matches.

## Automatic points

Each required player represents two standard team points across the normal format:

- one singles point;
- one doubles player-point.

Therefore a locked lineup shortfall of one player exposes **two automatic points** to the opponent. A two-player shortfall exposes four, and so on.

Historical scoreboards strongly support this interpretation when the old player-fact count is usable as a lineup proxy:

- 2025-26 January, Wild Turkey had a two-player shortfall proxy; Dark Knights' scoreboard contained four points beyond its rated-player total.
- 2025-26 February, Cougar Country had a three-player shortfall proxy; Beast Mode had six points beyond its rated-player total.
- 2025-26 November, Dark Knights had a one-player shortfall proxy; Riptide had two points beyond its rated-player total.

The old archive is not clean enough to use player-fact counts as an exact lineup record in every match, so these examples validate the rule but do not justify reconstructing every historical automatic point from the fact table.

## Women bonus opportunities

The useful quantity is **opportunities**, not guaranteed points.

In the normal singles+doubles structure, one additional female player relative to the opponent can create two women-vs-men bonus opportunities during the round — one associated with singles and one with doubles. Thus a 2F-vs-1F structure can expose two opportunities; a 4F-vs-1F structure can expose six.

The historical data supports treating these as opportunities rather than automatic awards. After removing the simple automatic-point expectation from the scoreboard residual:

- the one historical 3-female-advantage sample produced six additional scoreboard points;
- four 2-female-advantage samples ranged from one to four additional points;
- 1-female-advantage samples varied from zero to two positive points in the cleaner cases.

That variation is consistent with an opportunity whose actual award depends on the match outcome. The samples are too small and mixed with penalties/other special rows to calibrate a public expected-bonus formula yet.

## V1 implementation decision

V1 now exposes two different structural concepts:

1. **Automatic points** — deterministic once a true locked-lineup shortfall is known. They may enter Expected Points directly.
2. **Women bonus opportunity count** — deterministic once female lineup composition is known, but **not automatically converted into expected points**.

Future matchup-level work can estimate the probability of earning each women bonus opportunity from the actual female-vs-male CI matchup. Until then, V1 records the composition and leaves the opportunity unscored rather than inventing an expectation.

## Data collection

Prediction snapshots now preserve, for both teams at Active Roster, Confirmed Available and Match Lineup stages:

- exact selected player IDs;
- total player count;
- female player count;
- male player count;
- unknown-gender count;
- raw shortfall from 18;
- provisional/fallback/omitted CI counts.

That will allow the 2026-27 season to validate structural scoring using point-in-time data rather than historical reconstruction.
