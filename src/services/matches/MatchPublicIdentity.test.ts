import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getMatchPublicIdentities,
  publicMatchHref,
  resolveMatchPublicReference,
} from '@/services/matches/MatchPublicIdentity';

type MatchRow = {id: string; public_slug?: string | null};
type AliasRow = {alias: string; match_id: string};

function fakeSupabase(input: {
  matches: MatchRow[];
  aliases?: AliasRow[];
  identitySchemaAvailable?: boolean;
}) {
  const schemaAvailable = input.identitySchemaAvailable !== false;

  return {
    from(table: string) {
      let selectColumns = '';
      let eqFilter: [string, string] | undefined;

      return {
        select(columns: string) {
          selectColumns = columns;
          return this;
        },
        eq(column: string, value: string) {
          eqFilter = [column, value];
          return this;
        },
        async maybeSingle() {
          if (!schemaAvailable && selectColumns.includes('public_slug')) {
            return {data: null, error: {code: '42703', message: 'column public_slug does not exist'}};
          }

          const source = table === 'launch_match_url_aliases'
            ? input.aliases ?? []
            : input.matches;
          const row = eqFilter
            ? source.find((candidate: any) => candidate[eqFilter![0]] === eqFilter![1])
            : undefined;
          if (!row) return {data: null, error: null};

          if (table === 'launch_schedule_matches' && selectColumns === 'id') {
            return {data: {id: (row as MatchRow).id}, error: null};
          }
          if (table === 'launch_match_url_aliases') {
            return {data: {match_id: (row as AliasRow).match_id}, error: null};
          }
          return {
            data: {
              id: (row as MatchRow).id,
              public_slug: (row as MatchRow).public_slug ?? null,
            },
            error: null,
          };
        },
        async in(column: string, values: string[]) {
          if (!schemaAvailable && selectColumns.includes('public_slug')) {
            return {data: null, error: {code: '42703', message: 'column public_slug does not exist'}};
          }
          const rows = input.matches
            .filter((row: any) => values.includes(row[column]))
            .map((row) => ({id: row.id, public_slug: row.public_slug ?? null}));
          return {data: rows, error: null};
        },
      };
    },
  };
}

test('canonical slug resolves to the permanent internal match id', async () => {
  const client = fakeSupabase({
    matches: [{id: 'legacy-semantic-id', public_slug: 'beast-mode-at-riptide-2026-r1'}],
  });

  const resolved = await resolveMatchPublicReference(client as any, 'beast-mode-at-riptide-2026-r1');
  assert.deepEqual(resolved, {
    matchId: 'legacy-semantic-id',
    publicSlug: 'beast-mode-at-riptide-2026-r1',
    matchedBy: 'slug',
  });
});

test('legacy id remains resolvable and points to the canonical slug', async () => {
  const client = fakeSupabase({
    matches: [{id: 'old-match-id', public_slug: 'kb-at-dark-knights-2026-r1'}],
  });

  const resolved = await resolveMatchPublicReference(client as any, 'old-match-id');
  assert.equal(resolved?.matchedBy, 'id');
  assert.equal(publicMatchHref(resolved!), '/matches/kb-at-dark-knights-2026-r1');
});

test('previous slug aliases resolve to the current canonical slug', async () => {
  const client = fakeSupabase({
    matches: [{id: 'match-1', public_slug: 'hayneous-og-s-at-ninjas-2026-r1'}],
    aliases: [{alias: 'hayneous-og-s-at-dark-knights-2026-r1', match_id: 'match-1'}],
  });

  const resolved = await resolveMatchPublicReference(
    client as any,
    'hayneous-og-s-at-dark-knights-2026-r1',
  );
  assert.equal(resolved?.matchedBy, 'alias');
  assert.equal(resolved?.matchId, 'match-1');
  assert.equal(resolved?.publicSlug, 'hayneous-og-s-at-ninjas-2026-r1');
});

test('pre-migration schema falls back to existing internal-id routes', async () => {
  const client = fakeSupabase({
    matches: [{id: 'legacy-match-id'}],
    identitySchemaAvailable: false,
  });

  const resolved = await resolveMatchPublicReference(client as any, 'legacy-match-id');
  assert.deepEqual(resolved, {
    matchId: 'legacy-match-id',
    publicSlug: null,
    matchedBy: 'id',
  });

  const identities = await getMatchPublicIdentities(client as any, ['legacy-match-id']);
  assert.equal(publicMatchHref(identities.get('legacy-match-id')!), '/matches/legacy-match-id');
});
