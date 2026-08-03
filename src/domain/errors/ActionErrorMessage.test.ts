import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeActionError,
  normalizeAuthError,
  SIGN_IN_REQUIRED_MESSAGE,
} from './ActionErrorMessage';

test('normalizes known action failures into stable user messages', () => {
  assert.deepEqual(normalizeActionError('Sign in with an approved captain account.', 'Fallback'), {
    category: 'authentication',
    message: SIGN_IN_REQUIRED_MESSAGE,
  });
  assert.equal(
    normalizeActionError('Roster confirmation is closed for this match.', 'Fallback').category,
    'match_locked',
  );
  assert.equal(
    normalizeActionError('That player is not on a team you manage for this match.', 'Fallback').category,
    'team_participation',
  );
  assert.equal(
    normalizeActionError('Your profile is pending approval.', 'Fallback').category,
    'profile_pending',
  );
});

test('mixed workflow language does not misclassify an inactive profile as pending', () => {
  const result = normalizeActionError('Only pending or approved accounts can be linked.', 'Safe fallback');
  assert.equal(result.category, 'database_or_unexpected');
  assert.equal(result.message, 'Safe fallback');
});

test('authorization failures remain failures with a role-safe message', () => {
  const result = normalizeActionError('Captain access is required.', 'Fallback');
  assert.deepEqual(result, {
    category: 'authorization',
    message: 'This action is not permitted for your role.',
  });
});

test('unknown and database errors use the supplied safe fallback', () => {
  const sqlError = {message: 'new row violates row-level security policy', code: '42501'};
  assert.deepEqual(normalizeActionError(sqlError, 'Attendance could not be saved. Try again.'), {
    category: 'database_or_unexpected',
    message: 'Attendance could not be saved. Try again.',
  });
  assert.doesNotMatch(
    normalizeActionError(sqlError, 'Attendance could not be saved. Try again.').message,
    /row-level security/i,
  );
});

test('auth normalization recognizes expected failures and hides unknown provider details', () => {
  assert.equal(
    normalizeAuthError({message: 'Invalid login credentials'}).message,
    'Email or password is incorrect. Use password reset if needed.',
  );
  assert.equal(
    normalizeAuthError({message: 'relation auth.identities is unavailable'}).message,
    'The account request could not be completed. Please try again.',
  );
});
