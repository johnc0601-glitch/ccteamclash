# Production audit repair — September 25, 2026

## Scope and current status

Prepared against production main commit `6274380`. Changes are isolated from the ongoing PWA and sports-navigation branches. No production database migration or production deployment has been performed.

The owner confirmed that Beast Mode cannot play at Beast on Honey Hill and its replacement venue is unknown. Do not reactivate that course or invent a replacement.

## Repairs included

- Existing-player registration now creates a pending claim. Selecting a public name cannot immediately link an identity or grant private team access. Commissioners approve the claim through a single transaction, without renaming the historical player from unverified account input.
- Database triggers prevent changing Clubhouse post/comment identity, author, destination, or creation time. Body edits and commissioner pinning remain supported.
- Future scheduled Beast Mode home games at the unavailable course have a targeted migration to clear their venue. Historical match assignments remain intact. Schedule and match pages support a null venue, show **To be confirmed**, and omit unavailable directions. Publishing still requires teams, date, and time.
- Commissioner roster corrections require snapshots for both participating teams. Roster exports sort player names consistently.
- Home page says **Upcoming matches**. The stats table no longer reports no matching players while the full list is loading.
- Roster tests now reflect the previous-Friday lock rule; schedule integration tests establish their own season fixture.

## Validation

- 59 focused Node tests passed across roster locks, roster services, schedule integration, matchday resolution, public match identity, and stats-page behavior.
- `npm run build` passed using staging Supabase publishable settings. Credentials are untracked.
- Both migrations executed successfully on staging inside a rolled-back transaction. Synthetic authenticated-role tests proved pending claims stay unlinked, self-approval fails, new-player setup cannot bypass a pending claim, commissioner approval works, normal post/comment edits and pinning work, and author reassignment fails. Anonymous callers lack approval-function execution permission.
- Reusable database assertions: `supabase/tests/audit_identity_and_clubhouse.sql`. Run only on staging after loading the identity migration; the test rolls back its fixture data. To test the migration itself without persisting it, put the migration and test body in one transaction ending in rollback.
- Standalone `npx tsc --noEmit` still reports existing test-only errors: missing Vitest dependencies and outdated story/statistics fixtures. Next's application build type check passes. The earlier full lint audit also identified a separate existing backlog; this repair does not claim the entire repository is lint-clean.

## Rollout order

1. Review this branch and its security behavior. Reconcile with any concurrent identity/account changes before merging.
2. Apply the identity/Clubhouse migration to the intended database before deploying the application, since approval uses the new RPC. Existing accounts remain linked; only new existing-player claims require review.
3. Deploy and verify the application against the migrated database: claim a test player, approve as commissioner, edit a Clubhouse post, and inspect a match with no venue. Never use a real player's identity for the test.
4. Apply the targeted Beast Mode venue migration once the null-venue UI is deployed. Verify all expected matches remain visible, with no Honey Hill directions for future Beast Mode fixtures.
5. Monitor claim approvals and match routes. Prefer a forward fix for security regressions; do not restore automatic identity linking. No venue should be restored without confirmed permission to play there.

## Remaining audit work

| Priority | Work | Acceptance check |
| --- | --- | --- |
| High | Review other identity/account RPCs alongside the concurrent app work; retain verification and account-deletion protections | No alternate path links an unverified existing player |
| Medium | Establish and monitor the roster snapshot scheduler; avoid duplicating staging's existing cron work | Snapshot creation occurs at the intended lock without a page visit |
| Medium | Enable leaked-password protection where supported | Supabase Auth setting verified and sign-up tested |
| Medium | Restore repository-wide test/type/lint health | Supported runner installed, stale fixtures repaired, documented CI gates green |
| Medium | Commissioner who is also a captain: reconcile reminder authorization | Authorized captain duties work for both roles; unrelated teams remain blocked |
| Low | Replace Burnt Mill's UDisc management link with its verified public course URL | Signed-out visitor reaches the public course |
| Low | Add canonical sitemap and robots metadata | Public indexing endpoints return valid content |

Staging advisor findings also include `pg_net` in public, intentional privileged RPCs requiring per-function review, and an RLS-enabled notification outbox without client policies. Do not add client outbox policies merely to silence an informational finding. Password guidance: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection . Extension guidance: https://supabase.com/docs/guides/database/database-linter?lint=0014_extension_in_public .
