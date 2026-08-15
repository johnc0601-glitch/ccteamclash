import assert from 'node:assert/strict';
import test from 'node:test';
import {parsePlayerApplicationForm} from './playerApplicationForm';

function baseForm(): FormData {
  const form = new FormData();
  form.set('displayName', ' John Smith ');
  form.set('seasonId', 'season-1');
  form.set('requestedTeamId', 'dark-knights');
  form.set('playerType', 'Junior');
  form.set('gender', 'Female');
  return form;
}

test('new-player application requires no player history selection or claim data', () => {
  const form = baseForm();
  form.set('playedBefore', 'No');
  assert.deepEqual(parsePlayerApplicationForm(form), {
    ok: true,
    data: {
      displayName: 'John Smith',
      seasonId: 'season-1',
      requestedTeamId: 'dark-knights',
      playerType: 'Junior',
      gender: 'Female',
      playedBefore: false,
      requestedPlayerId: '',
      submittedPdgaNumber: '',
    },
  });
});

test('returning-player application requires and preserves the selected historical player', () => {
  const missing = baseForm();
  missing.set('playedBefore', 'Yes');
  assert.deepEqual(parsePlayerApplicationForm(missing), {
    ok: false,
    message: 'Choose your previous Team Clash player record.',
  });

  missing.set('requestedPlayerId', 'player-1');
  missing.set('submittedPdgaNumber', '12345');
  const parsed = parsePlayerApplicationForm(missing);
  assert.equal(parsed.ok, true);
  if (parsed.ok) {
    assert.equal(parsed.data.requestedPlayerId, 'player-1');
    assert.equal(parsed.data.submittedPdgaNumber, '12345');
  }
});

test('invalid classifications and played-before values fail closed', () => {
  const form = baseForm();
  form.set('playerType', 'Unknown');
  form.set('playedBefore', 'Sometimes');
  assert.deepEqual(parsePlayerApplicationForm(form), {
    ok: false,
    message: 'Choose Adult or Junior.',
  });
});
