# Round 1 intro artwork

Place the original clean posters (without Matchday text) here:

- `01_KB_at_Dark_Knights.png`
- `02_Wild_Turkey_at_Cougar_Country.png`
- `03_Hayneous_OGs_at_Ninjas.png`
- `04_Beast_Mode_at_Riptide.png`

The finished poster binaries were not available in the referenced conversation's
attachments or local files when this feature was implemented. Do not substitute
team logos or claim these files are present. Missing files skip the intro safely.

Configuration: `src/components/matchday-intro/matchdayIntro.config.ts`.
Each public match slug maps to `{ matchId, label, desktop, mobile? }`.
Paths are public URLs, without the `public` prefix. Optional mobile crops can be
named `01_KB_at_Dark_Knights.mobile.png`, etc.; add their paths as `mobile`.
Below 768px, mobile artwork is selected; absent/broken crops fall back to desktop.
Art is contained, never zoomed or automatically cropped.

Use `MatchdayLink` for links intended to trigger the intro. Ordinary links,
direct visits, refreshes, browser history and rerenders do not trigger it.
The root provider lets navigation load beneath the overlay without delaying it.
The sequence lasts 4.7s, with 0.7s opacity fades; reduced motion is static for 0.7s.
Skip, Escape, image errors, slow image loads and leaving the tab dismiss it.

The slugs and legacy IDs were verified from live `launch_schedule_matches` on
2026-09-27. Some IDs mention previous opponents; never derive artwork from ID text.
