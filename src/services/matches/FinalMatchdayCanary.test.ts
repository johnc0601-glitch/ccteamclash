import assert from 'node:assert/strict';
import test from 'node:test';
import {adaptCanarySnapshot, shouldUseFinalScoreboardCanary} from './FinalMatchdayCanary';
import type {FinalMatchdaySnapshot} from './FinalMatchdaySnapshot';

const TARGET='beast-mode-vs-riptide-3ed22cf9-623e-4c11-96a2-b0e6c42b7e0d';

function fixture(overrides:Partial<FinalMatchdaySnapshot>={}):FinalMatchdaySnapshot {
  return {
    matchId:TARGET,date:'2026-10-17',time:'10:00',roundNumber:2,
    publishedAt:'2026-10-18T01:00:00Z',
    homeTeam:{id:'riptide',name:'Riptide',logo:'',shortName:'RIP',primaryColor:'#ffe38d',secondaryColor:'#01c7fc'},
    awayTeam:{id:'beast-mode',name:'Beast Mode',logo:'',shortName:'BM',primaryColor:'#25820c',secondaryColor:'#ffde05'},
    homeScore:18,awayScore:18,contests:[],
    course:{id:'c',name:'Test course',mapUrl:null},weather:null,
    ...overrides,
  };
}

test('only the exact finalized Riptide–Beast matchup is enrolled',()=>{
  assert.equal(shouldUseFinalScoreboardCanary(fixture()),true);
  assert.equal(shouldUseFinalScoreboardCanary(fixture({publishedAt:null})),false);
  assert.equal(shouldUseFinalScoreboardCanary(fixture({date:'2026-10-10'})),false);
  assert.equal(shouldUseFinalScoreboardCanary(fixture({homeTeam:{...fixture().homeTeam,id:'ninjas'}})),false);
  assert.equal(shouldUseFinalScoreboardCanary(fixture({awayTeam:{...fixture().awayTeam,id:'ninjas'}})),false);
  assert.equal(shouldUseFinalScoreboardCanary(fixture({matchId:'other-2026-10-17'})),false);
});

test('existing locked match IDs never use the canary renderer',()=>{
  for(const matchId of [
    'hayneous-og-s-vs-dark-knights-c1b325a9-473a-4bed-a85c-0dec6766a766',
    'ninjas-vs-kb-cccdd6ca-c5ce-4ecb-b7c9-c02d7d657e9f',
    'wild-turkey-vs-team-focus-7fafa1dc-4ee3-4e7f-85dc-4b5f866275f2',
  ]) assert.equal(shouldUseFinalScoreboardCanary(fixture({matchId})),false);
});

test('canary adapter never modifies the immutable published snapshot or scores',()=>{
  const original=fixture({homeScore:21.5,awayScore:14.5});
  const copy=JSON.stringify(original);
  const v2=adaptCanarySnapshot(original);
  assert.deepEqual(v2.adjustments,[]);
  assert.equal(v2.homeScore,21.5);
  assert.equal(v2.awayScore,14.5);
  assert.equal(JSON.stringify(original),copy);
  assert.notEqual(v2,original);
});

test('environment kill switch retains the original final Matchday renderer',()=>{
  const prior=process.env.RIPTIDE_BEAST_SCOREBOARD_V2;
  process.env.RIPTIDE_BEAST_SCOREBOARD_V2='off';
  try {
    assert.equal(shouldUseFinalScoreboardCanary(fixture()),false);
  } finally {
    if(prior===undefined) delete process.env.RIPTIDE_BEAST_SCOREBOARD_V2;
    else process.env.RIPTIDE_BEAST_SCOREBOARD_V2=prior;
  }
});
