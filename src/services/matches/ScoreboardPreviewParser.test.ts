import assert from 'node:assert/strict';
import test from 'node:test';
import {parseScoreboardPreviewJson} from './ScoreboardPreviewParser';
import {buildFinalScoreBreakdown} from './FinalScoreBreakdown';

const input = {
  fixture: {
    matchId: 'ninja-ogs-2026',
    date: '2026-10-10',
    round: 1,
    course: 'Northeast Creek Park',
    homeTeamId:'ninjas',homeTeamName:'Ninjas',
    awayTeamId:'ogs',awayTeamName:"Hayneous OG's",
    homeScore: 30, awayScore:7.5,
  },
  websiteDraftInput: {
    homeScore:30, awayScore:7.5,
    contests:[
      {id:'s1',format:'Singles',position:1,homeOutcome:'W',awayOutcome:'L',
       players:[{playerId:'j-baus',side:'Home',slot:1},{playerId:'dave-van',side:'Away',slot:1}]},
    ],
  },
  whiteboardRows:[
    {format:'Singles',position:1,ninjas:'J Baus',ogs:'Dave Van Essendelft',outcome:'Ninjas'},
    {format:'Singles',position:2,ninjas:'Andrew Wilson',ogs:'Conner Garrett',outcome:'Unplayed — score allocation only'},
  ],
  unplayedContest:{
    format:'Singles',position:2,didNotTakePlace:true,
    ninjasPlayer:{id:'andrew-wilson',name:'Andrew Wilson'},
    ogsPlayer:{id:'conner-garrett',name:'Conner Garrett'},
    awardedTeamId:'ninjas',forfeitSlotPoints:1,
  },
  websiteStructuralPoints:[{awardedTeamId:'ninjas',category:'NoShow',points:2.5,note:'Combined reviewed structural points'}],
};

test('browser parser never lists the absent player as a participant',()=>{
  const {snapshot}=parseScoreboardPreviewJson(input);
  assert.equal(snapshot.contests.length,2);
  assert.equal(snapshot.contests[0].homePlayers[0].name,'J Baus');
  assert.equal(snapshot.contests[0].awayPlayers[0].name,'Dave Van Essendelft');
  const unplayed=snapshot.contests.find(c=>c.unplayed);
  assert.equal(unplayed?.position,2);
  assert.equal(unplayed?.homePlayers[0].name,'Andrew Wilson');
  assert.deepEqual(unplayed?.awayPlayers,[]);
  assert.equal(snapshot.contests.some(c=>c.awayPlayers.some(p=>p.name==='Conner Garrett')),false);
});

test('splits one combined no-show structural award without changing official score',()=>{
  const {snapshot}=parseScoreboardPreviewJson(input);
  assert.equal(snapshot.homeScore,30);
  assert.equal(snapshot.awayScore,7.5);
  assert.deepEqual(snapshot.adjustments.map(a=>[a.category,a.points]),[
    ['NoShow',1.5],['UnplayedSlot',1],
  ]);
  assert.equal(buildFinalScoreBreakdown(snapshot).playedSingles.home,1);
});

test('audit note alone is not a match file',()=>{
  assert.throws(()=>parseScoreboardPreviewJson({document_type:'commissioner_review_note',status:'AUDIT_ONLY_DO_NOT_IMPORT'}),/audit note/);
});

test('different official score is shown as-is and not reconciled by rewriting it',()=>{
  const {snapshot}=parseScoreboardPreviewJson({
    ...input,fixture:{...input.fixture,homeScore:28.5},
    websiteDraftInput:{...input.websiteDraftInput,homeScore:28.5},
  });
  assert.equal(snapshot.homeScore,28.5);
});
