# Matchday intro artwork

All four Round 1 matchups have desktop `.webp` and portrait `.mobile.webp` files.
The three portrait variants added on 2026-09-28 were created from their original
landscape posters; no pre-existing mobile copies were found. KB artwork is unchanged.

The permanent opening image is shared across every matchup and every round:
- `/matchday-intros/welcome/welcome-desktop-hq.webp`
- `/matchday-intros/welcome/welcome-mobile-hq.webp`

Keep these welcome assets unchanged when adding new matchups. Store only matchup
posters inside season/round folders. Map each public match slug and legacy ID in
`src/components/matchday-intro/matchdayIntro.config.ts`.

Below 768px, mobile artwork is selected. Broken mobile art falls back to the
full desktop image without cropping. Both welcome and matchup images must load
before animation starts; an 8-second loading timeout prevents a stuck overlay.
The standard sequence lasts 5.7 seconds, including a 1.2-second exit fade.
Reduced motion shows the same welcome then matchup as two static 0.7-second frames.

Use MatchdayLink with the live scheduledDate (YYYY-MM-DD) to trigger playback
only on that match date in America/New_York. Missing/TBD dates skip playback. Direct visits, refresh,
browser history and ordinary links do not trigger playback. Skip, Escape, image
failure and leaving the tab dismiss the intro. Match IDs may contain old team names;
use the explicit mappings rather than deriving artwork from the ID text.
