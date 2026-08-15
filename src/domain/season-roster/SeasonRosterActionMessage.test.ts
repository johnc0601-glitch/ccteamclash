import assert from 'node:assert/strict';
import test from 'node:test';
import {seasonRosterActionError} from '@/domain/season-roster/SeasonRosterActionMessage';

test('translates expected roster failures without exposing RPC or SQL details', () => {
  assert.equal(
    seasonRosterActionError({code: '23514', message: 'Season roster category cap has been reached.'}),
    'That roster category has reached its season cap.',
  );
  assert.equal(
    seasonRosterActionError({code: '23505', message: 'Player already has a permanent membership for this season.'}),
    'This player is already rostered or was previously dropped for this season.',
  );
  assert.equal(
    seasonRosterActionError({code: '42501', message: 'internal RLS policy detail'}),
    'This roster action is not permitted for your role.',
  );
});

test('unknown failures use a safe fallback', () => {
  assert.equal(
    seasonRosterActionError(new Error('sensitive database response body')),
    'The season roster could not be updated. Please try again.',
  );
});
