# Team Strength V1 — doubles pairing study

## Question

Captains do not pair doubles teams randomly. Historically, how different were actual 80/20 doubles pairs from a simple pooled-pair estimate, and what does that tell us about future calibration?

The website does **not** draft singles or doubles matchups. Actual pairings are post-match result data, not a public pre-match prediction stage.

## Historical sample

The study used **84 team-match samples** with complete historical doubles-pair facts.

For each team-match it compared:

1. the actual doubles pairs;
2. every plausible 80/20 pair from the full player pool that appeared for that team in the match;
3. every plausible 80/20 pair from only the players who actually played doubles.

Pair strength uses the established rule:

`0.80 × stronger CI + 0.20 × weaker CI`

## Main result

Actual average doubles pair CI across the 84 samples: **907.50**.

All-plausible-pairs expectation from the full match player pool: **907.51**.

Average difference: **-0.01 CI**.

At aggregate level, the simple pooled-pair estimate was almost exact.

## Captains are still not pairing randomly

The near-perfect aggregate result does **not** mean captain choices are random.

- Doubles participants averaged about **+4.36 CI** stronger than the full player pool.
- Given those selected doubles players, actual pairing structure reduced average 80/20 pair CI by about **3.35 CI** versus random pairing among those doubles players.
- Actual partners were much closer in rating: average partner CI gap **58.69** versus **71.93** for random full-pool pairs, a reduction of about **13.24 CI**.

In plain terms: captains tend to select a slightly stronger doubles subset, then pair those players in a more like-with-like structure. Those two effects nearly cancel in aggregate expected pair strength.

## Stability

Average actual-vs-full-pool pair-strength lift by season:

- 2024-25: **-1.54 CI**
- 2025-26: **+1.14 CI**

Team-level average lifts were small relative to their match-to-match variation, ranging roughly from **-3.36 CI (KB)** to **+3.14 CI (Riptide)** in the current sample. That is not enough evidence for a team-specific pairing bonus.

## V1 decision

Do **not** add a public pre-match doubles-pairing stage or a captain-specific pairing adjustment.

The pooled-pair result remains useful as historical calibration evidence and as a deterministic research baseline because it is:

- deterministic;
- cheap;
- easy to explain;
- historically very close to aggregate actual pair strength;
- free of unsupported captain-specific adjustments.

For completed matches, retrospective analysis uses the **actual recorded doubles pairs** with the locked 80/20 rule and the frozen pre-match Match Lineup CI values. It does not replace those actual pairs with a pooled estimate and it never looks up today's CI.

For future playoff or scenario research outside V1, the lower actual partner-rating gap may be useful for modeling score variance and matchup paths even though the current evidence does not support an aggregate team-specific pairing correction.
