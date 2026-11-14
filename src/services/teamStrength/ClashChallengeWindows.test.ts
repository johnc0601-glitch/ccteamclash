import assert from 'node:assert/strict';
import test from 'node:test';
import {isClashChallengeVisible, type ClashChallengeWindow} from './ClashChallengeWindows';

const window2: ClashChallengeWindow = {opensAt:'2026-11-09T05:00:00Z',closesAt:'2026-11-16T05:00:00Z'};
const window3: ClashChallengeWindow = {opensAt:'2026-11-16T05:00:00Z',closesAt:'2026-12-07T05:00:00Z'};
const window4: ClashChallengeWindow = {opensAt:'2026-12-07T05:00:00Z',closesAt:'2027-01-11T05:00:00Z'};
const window5: ClashChallengeWindow = {opensAt:'2027-01-11T05:00:00Z',closesAt:'2027-03-01T05:00:00Z'};
const r2 = {date:'2026-11-22', time:'09:00:00',status:'Scheduled'};
const r3 = {date:'2026-12-05', time:'09:00:00',status:'Scheduled'};
const r4 = {date:'2027-01-02', time:'09:00:00',status:'Scheduled'};
const r5 = {date:'2027-02-06', time:'09:00:00',status:'Scheduled'};

test('Only the remaining Round 2 matchup is eligible through November 15 Eastern', () => {
  const sunday = new Date('2026-11-16T04:59:00Z');
  assert.equal(isClashChallengeVisible(r2,window2,false,sunday),true);
  assert.equal(isClashChallengeVisible({...r2,date:'2026-11-07'},window2,false,sunday),false);
  assert.equal(isClashChallengeVisible(r3,window3,false,sunday),false);
  assert.equal(isClashChallengeVisible(r2,window2,false,new Date('2026-11-16T05:00:00Z')),false);
});

test('Round 3 opens Monday November 16 at midnight Eastern without opening Round 4', () => {
  const monday = new Date('2026-11-16T05:00:00Z');
  assert.equal(isClashChallengeVisible(r3,window3,false,monday),true);
  assert.equal(isClashChallengeVisible(r4,window4,false,monday),false);
  assert.equal(isClashChallengeVisible(r3,window3,true,monday),false);
  assert.equal(isClashChallengeVisible({...r3,status:'Postponed'},window3,false,monday),false);
});

test('Round 3 stops at match start, Round 4 and Round 5 automatically open on later Mondays', () => {
  assert.equal(isClashChallengeVisible(r3,window3,false,new Date('2026-12-05T13:59:00Z')),true);
  assert.equal(isClashChallengeVisible(r3,window3,false,new Date('2026-12-05T14:00:00Z')),false);
  assert.equal(isClashChallengeVisible(r4,window4,false,new Date('2026-12-07T05:00:00Z')),true);
  assert.equal(isClashChallengeVisible(r5,window5,false,new Date('2027-01-11T05:00:00Z')),true);
  assert.equal(isClashChallengeVisible(r4,window4,false,new Date('2027-01-11T05:00:00Z')),false);
});

test('No window means a historical or unscheduled round stays hidden', () => {
  assert.equal(isClashChallengeVisible(r3,null,false,new Date('2026-11-20T14:00:00Z')),false);
  assert.equal(isClashChallengeVisible(r3,{opensAt:'nonsense',closesAt:window3.closesAt},false,new Date('2026-11-20T14:00:00Z')),false);
});
