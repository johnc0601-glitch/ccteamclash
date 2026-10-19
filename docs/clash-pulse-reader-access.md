# Clash Pulse private reader access

## Intent
Give selected approved league users a **read-only** Clash Pulse research page without Commissioner Office permissions or database credentials.

## Behavior
- Approved Commissioners automatically see **Clash Pulse** in the desktop header and the mobile Tools menu.
- Individual approved noncommissioner accounts appear there only after a specific reader grant.
- Reader URL: `/clash-pulse`. Existing Office editor stays at `/office/clash-pulse`.
- The reader can choose a published season/round, filter categories, view source calculations, and copy a round briefing.
- The reader cannot generate facts, submit editorial notes, approve/hide facts, feature homepage items, edit results, or use Office.
- Hidden/superseded and unpublished-season fact records are excluded by the **database RLS policy**, not merely a hidden button.
- Existing POST/PATCH API authorization remains Commissioner-only. Existing homepage Clash Pulse remains public.
- Office > Settings permits Commissioners to grant and revoke readers. An account must already be Approved; new accounts are not created through the selector.

## Safe rollout
1. Merge/deploy the existing Clash Pulse 2.0 fact-library migration before this reader-access migration.
2. Apply `20261018223000_clash_pulse_reader_access.sql`. The migration is additive.
3. Deploy website code so reader accounts receive a menu link and `/clash-pulse` route.
4. With a test approved noncommissioner account: confirm signed-out access is denied; no grant is denied; grant enables a published round; editing endpoints reject POST/PATCH with 403; hidden and staging QA facts are absent.
5. In Office > Settings, revoke test grant and confirm the menu disappears on refresh and the route/API reject access.
6. Confirm Commissioner Office and existing homepage highlights remain unaffected.

## Staging status, Oct 18 2026
- Migration applied to project `ccteamclash-staging`; **zero** reader grants created.
- RLS enabled on `clash_pulse_readers`; authenticated readers table grants are SELECT/INSERT/DELETE with commissioner-gated insert/delete policies (three policies total).
- Reader-specific SELECT policy exists for Pulse facts.
- Staging Security Advisor still reports unrelated pre-existing notices; no new reader-access-specific advisory was detected.
- Full signed-in reader browser verification and production deployment are **not yet complete**.
