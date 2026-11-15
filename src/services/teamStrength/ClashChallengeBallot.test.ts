import test from 'node:test';
import assert from 'node:assert/strict';
import {isApprovedCommissionerClashPlayer,parseClashBallot} from './ClashChallengeBallot';

test('only approved commissioners can vote, even without a linked player', () => {
  assert.equal(isApprovedCommissionerClashPlayer({role:'Commissioner',status:'Approved',playerId:'p1'}),true);
  assert.equal(isApprovedCommissionerClashPlayer({role:'Commissioner',status:'Approved',playerId:null}),true);
  assert.equal(isApprovedCommissionerClashPlayer({role:'Commissioner',status:'Pending',playerId:'p1'}),false);
  assert.equal(isApprovedCommissionerClashPlayer({role:'Player',status:'Approved',playerId:'p1'}),false);
  assert.equal(isApprovedCommissionerClashPlayer({role:'Captain',status:'Approved',playerId:'p1'}),false);
  assert.equal(isApprovedCommissionerClashPlayer({role:'Visitor',status:'Approved',playerId:'p1'}),false);
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
