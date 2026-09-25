import assert from 'node:assert/strict';
import test from 'node:test';
import {getCaptainRosterHref} from '@/services/matches/CaptainRosterNavigation';

test('captain roster links always open management mode at the roster panel', () => {
  assert.equal(
    getCaptainRosterHref('/matches/kb-at-dark-knights-2026-r1'),
    '/matches/kb-at-dark-knights-2026-r1?manage=roster#captain-roster',
  );
});

test('captain roster notices are encoded without losing the anchor', () => {
  assert.equal(
    getCaptainRosterHref('/matches/test-match', {captainNotice: 'Roster saved & locked.'}),
    '/matches/test-match?manage=roster&captainNotice=Roster+saved+%26+locked.#captain-roster',
  );
});
