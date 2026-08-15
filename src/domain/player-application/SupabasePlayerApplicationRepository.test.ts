import assert from 'node:assert/strict';
import test from 'node:test';
import type {SupabaseClient} from '@supabase/supabase-js';
import {
  SupabasePlayerApplicationRepository,
  toPlayerApplication,
} from '@/domain/player-application/SupabasePlayerApplicationRepository';
import type {Database} from '@/lib/supabase/database';

const row = {
  id: 'application-1',
  profile_id: 'profile-1',
  season_id: 'season-1',
  requested_team_id: 'team-1',
  player_type: 'Junior',
  gender: 'Female',
  played_before: true,
  status: 'Pending',
  created_at: '2026-08-15T20:00:00Z',
  updated_at: '2026-08-15T20:01:00Z',
  reviewed_at: null,
  reviewed_by: null,
};

test('maps every player application field', () => {
  assert.deepEqual(toPlayerApplication(row), {
    id: 'application-1',
    profileId: 'profile-1',
    seasonId: 'season-1',
    requestedTeamId: 'team-1',
    playerType: 'Junior',
    gender: 'Female',
    playedBefore: true,
    status: 'Pending',
    createdAt: '2026-08-15T20:00:00Z',
    updatedAt: '2026-08-15T20:01:00Z',
    reviewedAt: null,
    reviewedBy: null,
  });
});

test('submits through the narrow RPC and reads the RLS-visible result', async () => {
  const calls: Array<{name: string; args: unknown}> = [];
  const client = {
    rpc: async (name: string, args: unknown) => {
      calls.push({name, args});
      return {data: 'application-1', error: null};
    },
    from: () => ({
      select: () => ({
        eq: () => ({maybeSingle: async () => ({data: row, error: null})}),
      }),
    }),
  } as unknown as SupabaseClient<Database>;
  const repository = new SupabasePlayerApplicationRepository(client);

  const result = await repository.submitApplication({
    seasonId: 'season-1',
    requestedTeamId: 'team-1',
    playerType: 'Junior',
    gender: 'Female',
    playedBefore: true,
  });

  assert.equal(result.id, 'application-1');
  assert.deepEqual(calls, [{
    name: 'submit_launch_player_application',
    args: {
      target_season_id: 'season-1',
      target_requested_team_id: 'team-1',
      target_player_type: 'Junior',
      target_gender: 'Female',
      target_played_before: true,
    },
  }]);
});

test('propagates RPC errors without converting them to success', async () => {
  const expected = {code: '42501', message: 'permission denied'};
  const client = {
    rpc: async () => ({data: null, error: expected}),
  } as unknown as SupabaseClient<Database>;
  const repository = new SupabasePlayerApplicationRepository(client);

  await assert.rejects(
    repository.cancelApplication('application-1'),
    (error) => error === expected,
  );
});

test('review RPC accepts no actor, claim, profile, or membership fields', async () => {
  const calls: Array<{name: string; args: unknown}> = [];
  const client = {
    rpc: async (name: string, args: unknown) => {
      calls.push({name, args});
      return {data: 'application-1', error: null};
    },
    from: () => ({
      select: () => ({
        eq: () => ({maybeSingle: async () => ({data: {...row, status: 'Approved'}, error: null})}),
      }),
    }),
  } as unknown as SupabaseClient<Database>;
  const repository = new SupabasePlayerApplicationRepository(client);

  await repository.reviewApplication('application-1', 'Approved');
  assert.deepEqual(calls, [{
    name: 'review_launch_player_application',
    args: {target_application_id: 'application-1', target_status: 'Approved'},
  }]);
});
