# Level UP private organizer

Route: `/levelupdg`. Uses existing Supabase sign-in. Access is provisioned in
`levelup_owners` for the confirmed owner account, not by editable profile metadata.
Every server read, mutation and export rechecks the authenticated account. RLS
independently enforces the same ownership. Other Team Clash roles gain no access.

## Records and saves

The small single-owner league uses a versioned JSON workspace, separate from all
Team Clash tables. Each validated action reads the current version and writes with
an equality condition on that version. A conflicting tab receives HTTP 409 and the
latest snapshot; it cannot silently overwrite another save. The UI keeps checkboxes
unchanged until a save succeeds and offers explicit retry. This design is intended
for a small organizer-only league, not concurrent public registration at scale.

New seasons copy roster memberships only. Event attendance and measurements remain
independent. Removing roster membership never deletes attendance or player history.
Measurements are append-only through the application. Original imports are stored
in a separate read-only source archive. Do not commit source files or children’s
records to this repository.

Historical imports: 45 player profiles, 33 contacts, 85 source registrations,
664 player/event cells, 56 speed records and 13 distance records. Preserve all
1,555 populated source cells. Historical event dates are unknown and events are
closed initially. Spring timestamps include later months; season labels retain
the original filenames. Duplicate Jason Chenault registrations are provisionally
matched by trimmed name and guardian. Fall row 43 may contain shifted attendance;
header-based interpretation and original values are retained for review.

## Email

Recipient lists deduplicate normalized email addresses and omit invalid addresses.
A disabled duplicate suppresses that address. Season lists use current roster
membership. The organizer can select individual recipients and edit reminder/recap
templates. Gmail compose opens with BCC recipients, subject and body; the owner
reviews and sends in Gmail. This does not save drafts through the Gmail API or
confirm delivery. Long messages have copy fallbacks. Gmail API integration remains
optional and requires separately authorized Google OAuth credentials and consent.
No automated messages or reminders are sent by this application.

## Backup and recovery

Private exports provide Excel-compatible attendance and measurement CSVs and a
complete JSON backup including original sources. CSV values are neutralized against
spreadsheet formula injection. Backup/import provisioning scripts live outside the
repository. Data provisioning selects the verified user by email and uses
`ON CONFLICT DO NOTHING`, so reruns do not overwrite organizer edits.

For rollback, revert the route/library commit. Leave the three Level UP tables and
their RLS policies intact to preserve records. Do not revert by dropping tables.

## Verification

Run `node --loader ./scripts/ts-paths-loader.mjs --test src/lib/levelup/model.test.ts`
and `npm run build`. Check `/levelupdg`, `/levelupdg/api` and `/levelupdg/export`
while signed out and as a different account. In a rollback-only SQL transaction,
verify owner visibility, denied visibility for another UID and version conflicts.
Phone UI QA uses synthetic records only. No production test attendance or email
should be left behind.
