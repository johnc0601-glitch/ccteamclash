import assert from 'node:assert/strict';
import test from 'node:test';
import {adaptCanarySnapshot, loadPublishedCanaryAdjustments, parsePublishedCanaryAdjustments, shouldUseFinalScoreboardCanary} from './FinalMatchdayCanary';
import {buildFinalScoreBreakdown} from './FinalScoreBreakdown';
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

test('official Riptide–Beast penalty records reconcile the published final without touching the locked snapshot',()=>{
  const locked=fixture({
    awayScore:17,homeScore:19.5,
    contests: [
      {id:'s-away',format:'Singles',position:1,homeOutcome:'L',awayOutcome:'W',awayPlayers:[],homePlayers:[]},
      {id:'d-away',format:'Doubles',position:1,homeOutcome:'L',awayOutcome:'W',awayPlayers:[],homePlayers:[]},
    ],
  });
  const before=JSON.stringify(locked);
  const adjustments=parsePublishedCanaryAdjustments([
    {awarded_team_id:'beast-mode',category:'WomenBonus',points:'2',note:'Two missing female positions'},
    {awarded_team_id:'beast-mode',category:'NoShow',points:'0.5',note:'Rostered no-show'},
    {awarded_team_id:'other-team',category:'Penalty',points:99,note:'Invalid'},
  ],'beast-mode','riptide');
  assert.equal(adjustments.length,2);
  assert.equal(adjustments.reduce((sum,row)=>sum+row.points,0),2.5);
  const board=adaptCanarySnapshot(locked,adjustments);
  assert.equal(board.awayScore,17);
  assert.equal(board.homeScore,19.5);
  assert.equal(JSON.stringify(locked),before);
  assert.notEqual(board.adjustments,adjustments);
});

test('public canary adjustment fetch reads the exact match ID and safely refuses other matches',async()=>{
  let requested='';
  const client={
    from:(table:string)=>{
      assert.equal(table,'launch_match_structural_points');
      return {
        select:(_columns:string)=>({
          eq:(col:string,matchId:string)=>{
            assert.equal(col,'match_id');
            requested=matchId;
            return {order:async()=>({data:[
              {awarded_team_id:'beast-mode',category:'WomenBonus',points:'2',note:'Short female'},
              {awarded_team_id:'beast-mode',category:'NoShow',points:'0.5',note:'Rostered no-show'},
            ],error:null})};
          },
        }),
      };
    },
  };
  const correct=await loadPublishedCanaryAdjustments(client,fixture({awayScore:17,homeScore:19.5}));
  assert.equal(requested,TARGET);
  assert.equal(correct.length,2);
  requested='';
  const ignored=await loadPublishedCanaryAdjustments(client,fixture({matchId:'other'}));
  assert.deepEqual(ignored,[]);
  assert.equal(requested,'');
});

test('production-like full final score is balanced after loading the itemized adjustments',()=>{
  const snap=fixture({
    awayScore:17, homeScore:19.5,
    contests:[
      ...Array.from({length:10},(_,i)=>({
        id:'bs'+i,format:'Singles' as const,position:i+1,
        awayOutcome:'W' as const, homeOutcome:'L' as const, awayPlayers:[], homePlayers:[],
      })),
      {id:'stie',format:'Singles',position:11,awayOutcome:'T',homeOutcome:'T',awayPlayers:[],homePlayers:[]},
      ...Array.from({length:7},(_,i)=>({
        id:'rs'+i,format:'Singles' as const,position:12+i,
        awayOutcome:'L' as const,homeOutcome:'W' as const,awayPlayers:[],homePlayers:[],
      })),
      ...Array.from({length:2},(_,i)=>({
        id:'bd'+i,format:'Doubles' as const,position:i+1,
        awayOutcome:'W' as const,homeOutcome:'L' as const,awayPlayers:[],homePlayers:[],
      })),
      ...Array.from({length:6},(_,i)=>({
        id:'rd'+i,format:'Doubles' as const,position:i+3,
        awayOutcome:'L' as const,homeOutcome:'W' as const,awayPlayers:[],homePlayers:[],
      })),
    ],
  });
  const board=adaptCanarySnapshot(snap,parsePublishedCanaryAdjustments([
    {awarded_team_id:'beast-mode',category:'WomenBonus',points:'2',note:'Missing female'},
    {awarded_team_id:'beast-mode',category:'NoShow',points:'0.5',note:'No show'},
  ],'beast-mode','riptide'));
  const totals=buildFinalScoreBreakdown(board);
  assert.equal(totals.balanced,true);
  assert.deepEqual(totals.singles,{away:10.5,home:7.5});
  assert.deepEqual(totals.doubles,{away:4,home:12});
  assert.deepEqual(totals.otherAdjustments,{away:2.5,home:0});
  assert.deepEqual(totals.unitemized,{away:0,home:0});
});
