# Matchup preview standard

Approved through the Beast Mode at Dark Knights Round 2 preview, October 30, 2026. Use this as the default for future matchup previews and related page changes. Later user instructions take precedence.

## Publication plan

- Publish a separate brief preview on each matchup page early, including Players to Watch. Do not hold player selections until attendance is confirmed.
- Publish the expanded preview on the Friday before the match, informed by attendance. Add useful player comparisons and possible matchup storylines to give readers a reason to return.
- Update the same matchup page. Keep early selections distinct from confirmed attendance; do not describe possible pairings as confirmed.
- Early closing copy: "Check back Friday for our expanded preview, with a closer look at who's coming and the matchups that could decide this one."
- Replace that invitation when the expansion is actually published. Do not promise automated publication unless separately configured.

## Page layout

- Keep the preview directly in the page, always visible. No preview dropdown or accordion.
- Retain the existing site colors and typography.
- Keep only a compact Series summary above the writeup. Remove the Proven and Swing Players summary boxes; the editorial Players to Watch paragraphs provide that analysis more professionally (user update November 2, 2026).
- Keep full names, CI, and relevant head-to-head records in the article, with explanations rather than duplicate summary lists.
- Bold Players to Watch headings and each player-name/CI label. Render What to Watch as a prominent callout.
- Reuse the existing Team Stats section instead of duplicating the same table in preview text.

## Player-selection rules

The old automated Proven/Swing summary selections are retired from the public preview. Use CI, historical wins, and opponent-specific records as evidence when selecting and explaining Players to Watch in the article. Favor varied stories across the CI range; show actual records and identify small samples. Do not require separate automated category selections.

### Players to Watch in the article

- Feature two players per team with short explanations, using a mix of CI and relevant head-to-head history.
- Choose the strongest supported storylines; do not duplicate them in separate Proven/Swing summary boxes.
- Explain whether a head-to-head record covers an opposing team or an individual. Identify singles, doubles, or combined results as applicable.
- Include the CI check date and an attendance/pairings qualification until confirmed.

## Team statistics

- Match details: away at home, date, time, course.
- Current-season W-L-T, last opponent and final score, season points percentage.
- Team series record including playoffs, and last meeting when verified.
- Singles/doubles percentages with W-L-T and sample size. Explicitly label the season; current pages may show the previous season's archived format stats.
- Percentage formula: (wins + 0.5 * ties) / contests played.
- Use finalized results only; distinguish current-season, historical, career, and opponent-specific figures.

## Writing template

1. A short matchup-specific headline.
2. Roughly 75-100 words establishing recent results, stakes, and one compelling angle.
3. Players to Watch: two brief entries per team, away first.
4. What to Watch: one clear question the match will answer.
5. Friday return invitation for the early version.

Write in the established rivalry/story-driven style. Keep early coverage concise; save attendance-informed detail and potential pairings for Friday.

## Player wording and corrections

- User editorial preference: use she/her for all female players in league writeups. Check the recorded player information rather than guessing from names.
- Logan Canale uses she/her, confirmed by the user on October 30, 2026. Use female pronouns in future writeups about Logan.
- Do not infer pronouns from a player's name. Use confirmed information; when uncertain, use the player's name or rewrite without a pronoun.
- Before publishing, check each player paragraph for pronoun consistency as well as names, ratings, and records.

## Data and publishing lessons

- Read the actual historical records; never infer an unbeaten record from a win count alone.
- Load all pages of historical data. The first 1,000 of 2,568 records previously omitted eligible players and produced false "none found" messages. Use stable ordering when paging and refresh affected caches when correcting loaders.
- The existing preview text field is limited to 2,000 characters. Fit concise copy within it; changing the limit is a separate implementation decision.
- The renderer supports bold player/CI lines and Players to Watch headings. Use `What to watch: <question>` for the existing callout. Do not insert Markdown asterisks unless the renderer supports them; they previously appeared literally.
- Save source files as UTF-8. A Windows encoding mismatch previously broke deployment.
- Verify content persists after reload. For code changes, passing local tests or opening a PR does not mean the change is live: merge/deploy within the authorized scope, then verify the public page before reporting it live.
- The primary workspace checkout may be older than production. Locate the current source before editing; preserve unrelated local changes.

## Reference example (not permanent selections)

Beast Mode at Dark Knights, November 7, 2026, Burnt Mill Creek:

- Proven: Alex Stanley (BM), CI 911, 11 historical wins; Eric England (DK), CI 968, 14 historical wins.
- Swing: Misti Lee (BM), CI 867, 2-0 vs DK; Philip Murray (DK), CI 861, 1-0 vs BM.
- Editorial Players to Watch: Brooks McGill, Hastin McGill, Whit Stephenson, Eric England.
- Approved implementation history: PRs #304-307 in johnc0601-glitch/ccteamclash. Verify the latest code rather than assuming a prior branch is current.

These names, ratings, and counts are a dated example. Recompute and verify for each new preview.
