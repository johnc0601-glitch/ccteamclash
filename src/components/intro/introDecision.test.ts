import assert from 'node:assert/strict';
import test from 'node:test';
import {decideIntroPlayback, parseIntroQuery} from './introDecision.ts';

test('query overrides take priority over login and session state', () => {
  assert.equal(decideIntroPlayback({
    queryOverride: 'play',
    hasLoginMarker: false,
    hasPlayedThisSession: true,
  }), true);
  assert.equal(decideIntroPlayback({
    queryOverride: 'skip',
    hasLoginMarker: true,
    hasPlayedThisSession: false,
  }), false);
});

test('automatic playback requires a login marker and an unplayed session', () => {
  assert.equal(decideIntroPlayback({
    queryOverride: null,
    hasLoginMarker: true,
    hasPlayedThisSession: false,
  }), true);
  assert.equal(decideIntroPlayback({
    queryOverride: null,
    hasLoginMarker: true,
    hasPlayedThisSession: true,
  }), false);
  assert.equal(decideIntroPlayback({
    queryOverride: null,
    hasLoginMarker: false,
    hasPlayedThisSession: false,
  }), false);
});

test('intro query parser only accepts explicit play and skip values', () => {
  assert.equal(parseIntroQuery('1'), 'play');
  assert.equal(parseIntroQuery('0'), 'skip');
  assert.equal(parseIntroQuery('true'), null);
  assert.equal(parseIntroQuery(undefined), null);
});
