import assert from 'node:assert/strict';
import test from 'node:test';
import type {SupabaseClient} from '@supabase/supabase-js';
import {
  SupabaseSeasonRosterRepository,
  toMembership,
  toSeasonTeam,
} from '@/domain/season-roster/SupabaseSeasonRosterRepository';
import type {Database} from '@/lib/supabase/database';

test('maps every season-team field', () => {
  assert.deepEqual(toSeasonTeam({
    id: 'row-id',
    season_id: 'season-one',
    team_id: 'team-home',
    added_by: 'commissioner-profile',
    created_at: '2026-08-15T12:00:00Z',
  }), {
    id: 'row-id',
    seasonId: 'season-one',
    teamId: 'team-home',
    addedBy: 'commissioner-profile',
    createdAt: '2026-08-15T12:00:00Z',
  });
});

test('maps every Active and Dropped membership field', () => {
  const active = toMembership(row());
  const dropped = toMembership(row({
    status: 'Dropped',
    dropped_by: 'commissioner-profile',
    dropped_at: '2026-08-16T12:00:00Z',
  }));

  assert.deepEqual(active, {
    id: 'membership-id',
    seasonId: 'season-one',
    teamId: 'team-home',
    playerId: 'player-one',
    rosterCategory: 'Junior',
    status: 'Active',
    addedBy: 'captain-profile',
    addedAt: '2026-08-15T12:00:00Z',
    droppedBy: null,
    droppedAt: null,
    createdAt: '2026-08-15T12:00:00Z',
    updatedAt: '2026-08-15T12:00:00Z',
  });
  assert.equal(dropped.status, 'Dropped');
  assert.equal(dropped.droppedBy, 'commissioner-profile');
  assert.equal(dropped.droppedAt, '2026-08-16T12:00:00Z');
});

test('propagates add RPC errors without converting them into authorization success', async () => {
  const expected = {code: '42501', message: 'not permitted'};
  const repository = new SupabaseSeasonRosterRepository(clientWithRpcError(expected));

  await assert.rejects(() => repository.addMembership({
    seasonId: 'season-one',
    teamId: 'team-home',
    playerId: 'player-one',
    rosterCategory: 'Men',
  }), (error) => error === expected);
});

test('propagates drop RPC errors without converting them into authorization success', async () => {
  const expected = {code: '42501', message: 'not permitted'};
  const repository = new SupabaseSeasonRosterRepository(clientWithRpcError(expected));

  await assert.rejects(
    () => repository.dropMembership({seasonId: 'season-one', playerId: 'player-one'}),
    (error) => error === expected,
  );
});

function clientWithRpcError(error: object): SupabaseClient<Database> {
  return {
    rpc: async () => ({data: null, error}),
  } as unknown as SupabaseClient<Database>;
}

function row(overrides: Record<string, string | null> = {}) {
  return {
    id: 'membership-id',
    season_id: 'season-one',
    team_id: 'team-home',
    player_id: 'player-one',
    roster_category: 'Junior',
    status: 'Active',
    added_by: 'captain-profile',
    added_at: '2026-08-15T12:00:00Z',
    dropped_by: null,
    dropped_at: null,
    created_at: '2026-08-15T12:00:00Z',
    updated_at: '2026-08-15T12:00:00Z',
    ...overrides,
  };
}
