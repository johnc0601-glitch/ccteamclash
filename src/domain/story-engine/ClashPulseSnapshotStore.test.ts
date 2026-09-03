import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import type {SupabaseClient} from '@supabase/supabase-js';
import type {RatedResult} from './RatedResult';
import type {StoryBacktestReport} from './StoryBacktestReport';
import {
  buildClashPulseProvenance,
  ClashPulseSnapshotStore,
  type ClashPulseSnapshot,
} from './ClashPulseSnapshotStore';

function emptyReport(seasonId: string): StoryBacktestReport {
  return {
    seasonId,
    seasonName: seasonId,
    resultRows: 0,
    events: [],
    candidateCount: 0,
    countsByTrigger: {},
    countsByImportance: {candidate: 0, notable: 0, strong: 0, major: 0},
    scoreDistribution: {minimum: null, median: null, p75: null, p90: null, maximum: null},
    topCandidates: [],
    eventCandidates: [],
  };
}

function snapshot(seasonId: string, generatedAt: string): ClashPulseSnapshot {
  return {
    seasonId,
    seasonName: seasonId,
    report: emptyReport(seasonId),
    provenance: {
      snapshotVersion: 2,
      sourceTables: ['historical_clash_contest_rating_facts'],
      sourceResultIds: [],
      sourceContestIds: [],
      sourceEventIds: [],
      sourceAlgorithmVersions: [],
      sourcePlayedAt: {earliest: null, latest: null},
      sourceFactRows: 0,
      sourceContests: 0,
      emittedContests: 0,
      quarantinedContests: 0,
    },
    generatedAt,
    generatedBy: 'commissioner-1',
    refreshTrigger: 'test',
  };
}

function fakeSnapshotClient() {
  const rows = new Map<string, Record<string, unknown>>();
  let upsertCalls = 0;
  let fullListReads = 0;

  const client = {
    from(table: string) {
      assert.equal(table, 'clash_pulse_snapshots');
      return {
        select(columns: string) {
          return {
            async order() {
              if (columns !== 'season_id') fullListReads += 1;
              const ordered = [...rows.values()].sort((a, b) => String(a.season_id).localeCompare(String(b.season_id)));
              return {
                data: columns === 'season_id' ? ordered.map((row) => ({season_id: row.season_id})) : ordered,
                error: null,
              };
            },
            eq(column: string, value: string) {
              assert.equal(column, 'season_id');
              return {
                async maybeSingle() {
                  return {data: rows.get(value) ?? null, error: null};
                },
              };
            },
          };
        },
        async upsert(values: Array<Record<string, unknown>>, options: {onConflict?: string}) {
          assert.equal(options.onConflict, 'season_id');
          upsertCalls += 1;
          for (const value of values) rows.set(String(value.season_id), {...value});
          return {error: null};
        },
      };
    },
  } as unknown as SupabaseClient;

  return {
    client,
    get upsertCalls() { return upsertCalls; },
    get fullListReads() { return fullListReads; },
  };
}

describe('Clash Pulse snapshot provenance', () => {
  it('records stable source identities, versions, and time bounds', () => {
    const rows = [
      {id: 'r2', contestId: 'c1', eventId: 'e2', modelVersion: 'v2', playedAt: '2026-02-02T00:00:00Z'},
      {id: 'r1', contestId: 'c1', eventId: 'e1', modelVersion: 'v1', playedAt: '2026-01-01T00:00:00Z'},
    ] as RatedResult[];
    const value = buildClashPulseProvenance(rows, {
      sourceFactRows: 2, sourceContests: 1, emittedContests: 1, quarantinedContests: 0,
    });
    assert.deepEqual(value.sourceResultIds, ['r1', 'r2']);
    assert.deepEqual(value.sourceContestIds, ['c1']);
    assert.deepEqual(value.sourceAlgorithmVersions, ['v1', 'v2']);
    assert.deepEqual(value.sourcePlayedAt, {earliest: '2026-01-01T00:00:00Z', latest: '2026-02-02T00:00:00Z'});
    assert.equal(value.snapshotVersion, 2);
  });
});

describe('ClashPulseSnapshotStore', () => {
  it('saves a multi-season refresh in one upsert and round-trips the requested season', async () => {
    const fake = fakeSnapshotClient();
    const store = new ClashPulseSnapshotStore(fake.client);
    const first = snapshot('season-1', '2026-09-03T00:00:00Z');
    const second = snapshot('season-2', '2026-09-03T00:01:00Z');

    await store.saveMany([first, second]);

    assert.equal(fake.upsertCalls, 1);
    assert.deepEqual(await store.listSeasonIds(), ['season-1', 'season-2']);
    assert.deepEqual(await store.get('season-2'), second);
  });

  it('loads one requested snapshot without reading every saved report', async () => {
    const fake = fakeSnapshotClient();
    const store = new ClashPulseSnapshotStore(fake.client);
    await store.saveMany([
      snapshot('season-1', '2026-09-03T00:00:00Z'),
      snapshot('season-2', '2026-09-03T00:01:00Z'),
    ]);

    const loaded = await store.get('season-1');

    assert.equal(loaded?.seasonId, 'season-1');
    assert.equal(fake.fullListReads, 0);
  });
});
