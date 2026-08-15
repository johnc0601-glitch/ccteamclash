import assert from 'node:assert/strict';
import test from 'node:test';
import {playerApplicationReviewActionError} from './PlayerApplicationReviewActionMessage';

test('maps expected review failures to safe guidance', () => {
  assert.equal(
    playerApplicationReviewActionError(new Error('Resolve the returning-player claim before approval.')),
    'Resolve the returning-player claim before approval.',
  );
  assert.equal(
    playerApplicationReviewActionError({code: '42501', message: 'row-level security'}),
    'Approved Commissioner access is required.',
  );
});

test('does not expose unexpected database details', () => {
  assert.equal(
    playerApplicationReviewActionError({message: 'duplicate key violates constraint launch_profiles_pkey'}),
    'The player application could not be reviewed. Please try again.',
  );
});
