import assert from 'node:assert/strict';
import test from 'node:test';
import {playerApplicationActionError} from './PlayerApplicationActionMessage';

test('translates expected application failures without exposing RPC details', () => {
  assert.equal(
    playerApplicationActionError({code: '23514', message: 'requires an enrolled team in the open current season'}),
    'That team is not available for the current application season.',
  );
  assert.equal(
    playerApplicationActionError({code: '42501', message: 'database policy denied'}),
    'You are not permitted to change this player application.',
  );
});

test('unknown application failures use a safe message', () => {
  assert.equal(
    playerApplicationActionError(new Error('internal SQL diagnostics')),
    'Your player application could not be saved. Please try again.',
  );
});
