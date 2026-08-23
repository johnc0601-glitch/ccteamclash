# Around the Clash — Preview

Status: commissioner-only preview. Do not expose publicly or auto-publish.

## Locked prediction model

- Singles: home player receives +15 effective CI for expectation only.
- Doubles: pair CI = 80% stronger player + 20% weaker player.
- Doubles home adjustment: 0.
- Displayed/player CI is never changed by the temporary home adjustment.
- Model version: `2026-27-v1`.

## Data lifecycle

1. At roster lock, freeze each participating player's CI and model version.
2. Before results, a roster-level forecast may be generated from the frozen roster snapshot. It is commissioner-only.
3. Captains create actual pairings at the event; those pairings may not be known by the website until results are posted.
4. When results are posted, reconstruct each contest expectation using the frozen pre-event CI values, never post-result CI.
5. Store statistical facts separately from prose/story copy.
6. Rank facts at Match, Round/Event, Season, and All-Time scopes.
7. Commissioner chooses which ranked facts become Around the Clash material.

## Initial ranked categories

The engine should rank rather than filter. Preserve the full list so commissioners can choose.

- Lowest win-probability wins (singles and doubles separately)
- Largest CI deficits overcome
- Performance above expectation (`actual points - expected points`)
- Road wins ranked by pre-match probability
- Home wins ranked by pre-match probability
- Closest projected contests
- Favorite conversions
- Team points above/below projection
- Singles team performance vs expectation
- Doubles team performance vs expectation
- Team upset wins
- Closest team matches
- Largest team score deviations from projection

Each fact should retain raw context: player(s), teams, opponent(s), format, home/away, frozen CI, effective CI/pair CI, win probability, expected points, actual points, CI gap, match, event, season, and model version.

## Presentation plan

### Matchday
Commissioner-only Match Story panel after results are published. Detailed ranked facts for that match.

### Around the Clash
Commissioner-only round/event newsroom. Aggregate every completed match in the event and provide sortable ranked categories. This is the primary preview product.

### Season
Commissioner-only season leaderboard using the same facts. No separate calculation path.

## Editorial rule

The statistics layer is neutral. Do not suppress negative, repetitive, or unusual results in the data engine. Curation happens later in the commissioner Story Desk. AI prose is downstream of verified statistics and must not invent rankings or facts.

## Round 1 goal

Discovery mode. Capture broadly, rank everything, inspect which metrics create useful league stories, and do not retune the prediction model from a single round.
