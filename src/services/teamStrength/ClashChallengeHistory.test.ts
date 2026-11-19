import test from 'node:test';
import assert from 'node:assert/strict';
import {
  chooseChallengeRound,countChallengeRecord,evaluateClashChoice,selectedChallengeTeam,
  type ChallengeRoundOption,
} from './ClashChallengeHistory';

test('positive home projection grades correct favorite and underdog choices',()=>{
  assert.equal(evaluateClashChoice('low',18,24,5),'correct'); // favorite wins by 19
  assert.equal(evaluateClashChoice('high',18,24,5),'incorrect');
  assert.equal(evaluateClashChoice('high',18,21,4),'correct'); // favorite wins by only 17
  assert.equal(evaluateClashChoice('low',18,21,4),'incorrect');
  assert.equal(evaluateClashChoice('low',18,20,2),'push');
  assert.equal(evaluateClashChoice('high',18,20,2),'push');
});

test('negative home projection grades away favorite without flipping the outcome',()=>{
  assert.equal(evaluateClashChoice('low',-4.5,15,20),'correct');
  assert.equal(evaluateClashChoice('high',-4.5,15,20),'incorrect');
  assert.equal(evaluateClashChoice('high',-4.5,17,20),'correct');
  assert.equal(evaluateClashChoice('low',-4.5,17,20),'incorrect');
  assert.equal(evaluateClashChoice('low',-4.5,15,19.5),'push');
  assert.equal(selectedChallengeTeam('low',-4.5,'Cougar Country','Ninjas'),'Ninjas');
  assert.equal(selectedChallengeTeam('high',-4.5,'Cougar Country','Ninjas'),'Cougar Country');
});

test('no pick, future score and no line cannot be graded as incorrect',()=>{
  assert.equal(evaluateClashChoice(null,5,24,5),'no-pick');
  assert.equal(evaluateClashChoice('low',5,null,null),'pending');
  assert.equal(evaluateClashChoice('high',null,24,5),'pending');
  assert.equal(evaluateClashChoice('low',0,24,5),'pending');
  assert.deepEqual(countChallengeRecord([
    'correct','incorrect','push','no-pick','pending','not-offered','correct',
  ]),{correct:2,incorrect:1,pushes:1});
});

test('round selector auto-loads active round and respects previous-round requests',()=>{
  const rounds:ChallengeRoundOption[]=[
    {number:1,date:'2026-10-03',state:'past'},
    {number:2,date:'2026-11-07',state:'active'},
    {number:3,date:'2026-12-05',state:'future'},
  ];
  assert.equal(chooseChallengeRound(rounds,null),2);
  assert.equal(chooseChallengeRound(rounds,1),1);
  assert.equal(chooseChallengeRound(rounds,3),3);
  assert.equal(chooseChallengeRound(rounds,99),2);
  assert.equal(chooseChallengeRound(rounds.map(r=>({...r,state:r.number===2?'past':'future'})),null),1);
  assert.equal(chooseChallengeRound([],null),null);
});
