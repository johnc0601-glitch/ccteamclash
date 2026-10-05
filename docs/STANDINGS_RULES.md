# Standings Rules

Standings are calculated from published regular-season match results. Draft, reopened, and playoff results are excluded.

For each active team, standings calculate:

- Games played
- Wins
- Losses
- Clash points earned
- Clash points available
- Points percentage (`points earned / points available`)
- Point differential
- Round-by-round W/L result
- Round-by-round points earned and points available
- Current rank

A tied team match counts as a game played but does not add a win or loss.

Teams are ranked by:

1. Wins
2. Head-to-head result among teams tied on wins
3. Points percentage
4. Points earned
5. Point differential
6. Team name
7. Team ID

Head-to-head is evaluated before points percentage. When multiple tied teams create a circular head-to-head result, the unresolved portion falls back to points percentage.

Team name and ID provide deterministic ordering only.
