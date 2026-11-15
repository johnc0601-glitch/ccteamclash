import test from 'node:test';
import assert from 'node:assert/strict';
import {isRegisteredClashPlayer,parseClashBallot} from './ClashChallengeBallot';

test('registered and approved player, captain or commissioner can vote', () => {
  for (const role of ['Player','Captain','Commissioner']) {
    assert.equal(isRegisteredClashPlayer({role,status:'Approved',playerId:'p1'}),true);
  }
  assert.equal(isRegisteredClashPlayer({role:'Player',status:'Pending',playerId:'p1'}),false);
  assert.equal(isRegisteredClashPlayer({role:'Player',status:'Approved',playerId:null}),false);
  assert.equal(isRegisteredClashPlayer({role:'Visitor',status:'Approved',playerId:'p1'}),false);
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
