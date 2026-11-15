import test from 'node:test';
import assert from 'node:assert/strict';
import {canPlayClashChallenge,parseClashBallot} from './ClashChallengeBallot';

test('any signed-in account with a profile can play without league registration', () => {
  assert.equal(canPlayClashChallenge('account-1','profile-1'),true);
  assert.equal(canPlayClashChallenge('account-2','profile-not-registered'),true);
  assert.equal(canPlayClashChallenge(null,'profile-1'),false);
  assert.equal(canPlayClashChallenge('account-1',null),false);
  assert.equal(canPlayClashChallenge('','profile-1'),false);
});
test('ballot allows one through four updates, never duplicate or invalid choices', () => {
  const pick = (n:number) => ({matchId:'game-'+n,choice:'low',lineToken:'10.0|signed'});
  assert.equal(parseClashBallot(JSON.stringify([pick(1)]))?.length,1);
  assert.equal(parseClashBallot(JSON.stringify([1,2,3,4].map(pick)))?.length,4);
  assert.equal(parseClashBallot(JSON.stringify([pick(1),pick(1)])),null);
  assert.equal(parseClashBallot(JSON.stringify([1,2,3,4,5].map(pick))),null);
  assert.equal(parseClashBallot(JSON.stringify([{...pick(1),choice:'win'}])),null);
  assert.equal(parseClashBallot('[]'),null);
  assert.equal(parseClashBallot('bad json'),null);
});
