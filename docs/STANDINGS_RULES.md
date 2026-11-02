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

1. Win percentage (wins divided by games played)
2. Head-to-head among teams with the same win percentage, when head-to-head can resolve the tie
3. Unrounded points percentage (team points earned divided by combined team points earned in its played matches)
4. If still tied, a commissioner-organized abbreviated playoff to resolve the official ranking

For a multi-team tie, the head-to-head rules are applied to the remaining tied teams after each place is awarded. A team that beat every other tied team can claim the highest remaining position, and a team that lost to every other tied team can be placed last. Incomplete or circular head-to-head chains do not establish an overall ranking (A over B and B over C is not proof of A over C). When no outright first- or last-place head-to-head result exists, the highest remaining position is awarded by points percentage, and head-to-head is reconsidered for the remaining teams.

Team name and ID are deterministic display-order fallbacks only if the official tiebreakers remain unresolved; they do not replace the charter's abbreviated-playoff provision.
