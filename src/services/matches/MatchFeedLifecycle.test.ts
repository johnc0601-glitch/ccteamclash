import assert from 'node:assert/strict';
import test from 'node:test';
import {isMatchFeedOpen, matchFeedClosedMessage} from './MatchFeedLifecycle';

test('match feed stays open through the 30th Eastern calendar day', () => {
  assert.equal(isMatchFeedOpen('2026-07-18', new Date('2026-08-17T23:59:00-04:00')), true);
});

test('match feed closes on the next Eastern calendar day', () => {
  assert.equal(isMatchFeedOpen('2026-07-18', new Date('2026-08-18T00:00:00-04:00')), false);
});

test('match feed lifecycle is DST-safe for winter matches', () => {
  assert.equal(isMatchFeedOpen('2026-11-01', new Date('2026-12-01T23:59:00-05:00')), true);
  assert.equal(isMatchFeedOpen('2026-11-01', new Date('2026-12-02T00:00:00-05:00')), false);
});

test('matches without a usable date stay open rather than fail closed', () => {
  assert.equal(isMatchFeedOpen(null, new Date()), true);
  assert.equal(isMatchFeedOpen('pending', new Date()), true);
});

test('closed feed uses the preserved-history message', () => {
  assert.equal(matchFeedClosedMessage(), 'Match history preserved');
});
