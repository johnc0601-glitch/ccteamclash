import assert from 'node:assert/strict';
import test from 'node:test';
import type {SupabaseClient, User} from '@supabase/supabase-js';
import type {Database} from '@/lib/supabase/database';
import {completeAuthCallback} from './completeAuthCallback';

test('callback exchanges the one-time code and creates the normal authenticated profile session', async () => {
  const calls: string[] = [];
  const user = {id: 'user-1'} as User;
  const supabase = {
    auth: {
      exchangeCodeForSession: async (code: string) => {
        calls.push(`exchange:${code}`);
        return {error: null};
      },
      getUser: async () => {
        calls.push('get-user');
        return {data: {user}};
      },
    },
  } as unknown as SupabaseClient<Database>;

  const result = await completeAuthCallback(supabase, 'one-time-code', async (_client, callbackUser) => {
    calls.push(`profile:${callbackUser.id}`);
    return null;
  });

  assert.deepEqual(result, {ok: true, user});
  assert.deepEqual(calls, ['exchange:one-time-code', 'get-user', 'profile:user-1']);
});

test('reused or expired confirmation code fails safely before profile setup', async () => {
  let profileSetupCalled = false;
  const supabase = {
    auth: {
      exchangeCodeForSession: async () => ({error: {message: 'One-time token not found'}}),
    },
  } as unknown as SupabaseClient<Database>;

  const result = await completeAuthCallback(supabase, 'reused-code', async () => {
    profileSetupCalled = true;
    return null;
  });

  assert.deepEqual(result, {ok: false, message: 'One-time token not found', stage: 'exchange'});
  assert.equal(profileSetupCalled, false);
});

test('profile setup failure remains distinct from an invalid one-time code', async () => {
  const user = {id: 'user-1'} as User;
  const supabase = {
    auth: {
      exchangeCodeForSession: async () => ({error: null}),
      getUser: async () => ({data: {user}}),
    },
  } as unknown as SupabaseClient<Database>;

  const result = await completeAuthCallback(
    supabase,
    'fresh-code',
    async () => 'Your league profile could not be created.',
  );

  assert.deepEqual(result, {
    ok: false,
    message: 'Your league profile could not be created.',
    stage: 'profile',
  });
});
