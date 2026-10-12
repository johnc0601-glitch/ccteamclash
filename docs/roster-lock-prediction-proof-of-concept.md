# Roster-lock prediction proof of concept — October 12, 2026

These are historical reconstructions from official roster IDs and frozen pre-result CI, not forecasts actually saved before these matches. They are never inserted into the pre-match forecast table.

| Match | Home win chance | Expected score (home–away) | Published score | Standard points above expectation |
| --- | ---: | --- | --- | --- |
| DK–KB, Oct 3 | 64.9% | 19.04–16.96 | 23–13 | DK +3.96 |
| Ninjas–OG, Oct 10 | 95.0% (model cap) | 25.35–10.65 | 30–7.5 | Ninjas +3.15 |
| Cougar–Wild Turkey, Oct 3 | 88.3% | 21.37–14.63 | 22.5–13.5 | Cougar +1.13 |

DK and Ninjas are above-expectation performances, not team upsets. A team upset requires the winner to have a locked-roster win chance below 50%.

Ninjas' standard score is 28.5. Its extra 1.5 roster penalty points are excluded from performance: 28.5 − 25.3456 = +3.1544. Automatic missing-slot contest wins remain part of the standard contest score. Neither kind of point changes the roster-only odds or projected score.

Jeff Parsley's original Wild Turkey entry and CI 831 were frozen October 2. An erroneous Cougar entry was appended October 4. The corrected replay counts him only for Wild Turkey, leaving 19 Cougar players and 21 Wild Turkey players. His current CI 823 is not used. The source database row is retained; historical reconstruction resolves this opposing-roster duplicate from the unambiguous original frozen team.

## Implementation

- The existing authenticated roster snapshot job now also captures predictions for both teams. It freezes player IDs, CI, venue, model version, win chance and point share together. The database stores expected score and margin from the frozen point share on a 36-point basis.
- Duplicate captures preserve the first observation. Table access allows service inserts and commissioner reads; updates and deletes are not granted.
- Match-day and later captures are refused even if the match status was left Scheduled. Historical replays remain separately labeled.
- Clash Pulse prefers saved roster-lock predictions and uses frozen historical reconstruction only when no saved prediction exists. Above Expectations is a separate filter, available for favorites and underdogs, including a losing team that beats its projected score. Standard contest totals exclude extra roster penalties.
- The existing `team-clash-match-roster-snapshots-v2` job is active every five minutes. The new capture runs after official roster snapshots are processed, during the Friday roster-lock window; a missed capture is left missing. This first version uses that scheduled job rather than an atomic database lock trigger.

The additive database migration has been applied and permissions verified. The application changes require merging/deployment before the scheduled endpoint captures forecasts or the new filter appears.

Run the read-only replay with `node --loader ./scripts/ts-paths-loader.mjs scripts/roster-lock-poc.ts`.
