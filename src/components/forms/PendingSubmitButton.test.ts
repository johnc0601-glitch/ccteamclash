import assert from 'node:assert/strict';
import test from 'node:test';
import {getPendingButtonState} from './pendingButtonState';

test('pending submission disables the button and shows progress', () => {
  assert.deepEqual(getPendingButtonState(false, true, true, 'Confirm roster', 'Confirming...'), {
    disabled: true,
    label: 'Confirming...',
  });
});

test('an existing disabled state remains disabled when idle', () => {
  assert.deepEqual(getPendingButtonState(true, false, false, 'Add player', 'Adding...'), {
    disabled: true,
    label: 'Add player',
  });
});

test('idle enabled submission preserves its normal label', () => {
  assert.deepEqual(getPendingButtonState(false, false, false, 'Playing', 'Saving...'), {
    disabled: false,
    label: 'Playing',
  });
});

test('a sibling submit button disables without showing the wrong progress label', () => {
  assert.deepEqual(getPendingButtonState(false, true, false, 'Reject', 'Rejecting...'), {
    disabled: true,
    label: 'Reject',
  });
});
