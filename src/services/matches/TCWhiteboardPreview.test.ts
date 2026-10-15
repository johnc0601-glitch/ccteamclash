import assert from 'node:assert/strict';
import test from 'node:test';
import {parseScoreboardPreviewJson} from './ScoreboardPreviewParser';
import {buildFinalScoreBreakdown} from './FinalScoreBreakdown';
import {FALLBACK_PREVIEW_BRANDING} from './ScoreboardPreviewBranding';

const noShowId = 'fqvyo1qwhu8knh6gzi9269i7';
const wilsonId = 'e6sh0ydykxjisfuxyr3i8hua';
function fixture(matchId = 's7h85xt2g5chghk4zb60egge') {
  const singles = Array.from({length:18}, (_,i) => {
    const noShow = i === 3;
    const awayWin = i < 3;
    const tie = i === 17;
    const homePoints = tie ? .5 : awayWin ? 0 : 1;
    const awayPoints = tie ? .5 : awayWin ? 1 : 0;
    return {
      card: i === 3 ? 3 : Math.floor(i / 2) + 1, startingHole:String(i+1),
      away:{teamId:'ogs',players:[{id:noShow ? noShowId : `away-${i}`,name:noShow ? 'Conner Garrett' : `Away ${i}`}],points:awayPoints},
      home:{teamId:'ninjas',players:[{id:noShow ? wilsonId : `home-${i}`,name:noShow ? 'Andrew Wilson' : `Home ${i}`}],points:homePoints},
      result:{text:noShow ? '10&8' : tie ? 'PUSH' : '2UP',
        winner:tie ? null : awayWin ? 'away' : 'home',tie:null,forfeitedBy:null},
    };
  });
  const doubles = Array.from({length:9}, (_,i) => {
    const homeWin = i < 7;
    return {
      card:i+1,startingHole:String(i+1),
      away:{teamId:'ogs',players:[{id:`d-away1-${i}`,name:`Away First ${i}`},{id:`d-away2-${i}`,name:`Away Second ${i}`}],points:homeWin ? 0 : 2,strokes:homeWin?49:47},
      home:{teamId:'ninjas',players:[{id:`d-home1-${i}`,name:`Home First ${i}`},{id:`d-home2-${i}`,name:`Home Second ${i}`}],points:homeWin ? 2 : 0,strokes:homeWin?48:49},
      result:{text:homeWin?'by 1':'by 2',winner:homeWin?'home':'away',tie:null,forfeitedBy:null},
    };
  });
  return {
    schema:'tcwhiteboard.match/v1',
    generatedAt:'2026-10-14T01:04:46Z',
    season:{name:'2026–2027'},
    match:{
      id:matchId,date:'2026-10-10',status:'final',finalizedAt:'2026-10-12T01:28:19.13+00:00',
      home:{id:'ninjas',name:'Ninjas',points:28.5},
      away:{id:'ogs',name:'Hayneous OG’s',points:7.5},
      location:{name:'Northeast Creek Park'},
    },
    rounds:[
      {number:1,name:'Singles',points:{home:14.5,away:3.5},matchups:singles},
      {number:2,name:'Doubles',points:{home:14,away:4},matchups:doubles},
    ],
  };
}

test('native TCWhiteboard v1 parses all 27 rows and preserves 28.5–7.5 final', () => {
  const {snapshot,notes}=parseScoreboardPreviewJson(fixture());
  assert.equal(snapshot.contests.length,27);
  assert.equal(snapshot.contests.filter(c=>c.format==='Singles').length,18);
  assert.equal(snapshot.contests.filter(c=>c.format==='Doubles').length,9);
  assert.equal(snapshot.homeScore,28.5);
  assert.equal(snapshot.awayScore,7.5);
  assert.equal(snapshot.course.name,'Northeast Creek Park');
  assert.ok(notes.some(n=>n.includes('penalty ledger')));
});

test('confirmed absent player has no played singles contest and slot point stays in singles', () => {
  const {snapshot}=parseScoreboardPreviewJson(fixture());
  const noShow = snapshot.contests.find(c=>c.unplayed);
  assert.equal(noShow?.position,4);
  assert.equal(noShow?.card,3);
  assert.deepEqual(noShow?.awayPlayers,[]);
  assert.equal(noShow?.homePlayers[0].name,'Andrew Wilson');
  assert.equal(snapshot.contests.some(c=>!c.unplayed && c.awayPlayers.some(p=>p.id===noShowId)),false);
  assert.equal(snapshot.adjustments.length,1);
  assert.equal(snapshot.adjustments[0].category,'UnplayedSlot');
  assert.equal(snapshot.adjustments[0].points,1);
  const scores=buildFinalScoreBreakdown(snapshot);
  assert.deepEqual(scores.playedSingles,{home:13.5,away:3.5});
  assert.deepEqual(scores.singles,{home:14.5,away:3.5});
  assert.deepEqual(scores.doubles,{home:14,away:4});
  assert.deepEqual(scores.otherAdjustments,{home:0,away:0});
  assert.equal(scores.balanced,true);
});

test('no unplayed exception is assumed on another TCWhiteboard match', () => {
  const {snapshot}=parseScoreboardPreviewJson(fixture('another-match-id'));
  assert.equal(snapshot.contests.filter(c=>c.unplayed).length,0);
  assert.equal(snapshot.adjustments.length,0);
  assert.deepEqual(buildFinalScoreBreakdown(snapshot).singles,{home:14.5,away:3.5});
});

test('TCWhiteboard schema is required', () => {
  assert.throws(()=>parseScoreboardPreviewJson({
    ...fixture(),schema:'tcwhiteboard.match/v2',
  }),/Could not find both team names|different JSON format/);
});


test('official Ninjas and Hayneous OGs branding is matched by name, not TCWhiteboard IDs', () => {
  const {snapshot}=parseScoreboardPreviewJson(fixture(), FALLBACK_PREVIEW_BRANDING);
  assert.equal(snapshot.homeTeam.name,'Ninjas');
  assert.equal(snapshot.homeTeam.logo,'/team-logos/ninjas.jpg');
  assert.equal(snapshot.homeTeam.shortName,'NIN');
  assert.equal(snapshot.homeTeam.primaryColor,'#bf9222');
  assert.equal(snapshot.awayTeam.name,'Hayneous OG’s');
  assert.ok(snapshot.awayTeam.logo.endsWith('/teams/hayneous-og-s/logo.webp'));
  assert.equal(snapshot.awayTeam.shortName,'HOS');
  assert.equal(snapshot.awayTeam.primaryColor,'#1a0a52');
  assert.equal(snapshot.homeTeam.id,'ninjas');
  assert.equal(snapshot.awayTeam.id,'ogs'); // TCWhiteboard team ID retained
  assert.equal(snapshot.homeScore,28.5);
  assert.equal(snapshot.awayScore,7.5);
});

test('other teams do not inherit unmatched logos', () => {
  const other = fixture('unrelated-match-id');
  const {snapshot}=parseScoreboardPreviewJson({
    ...other,
    match:{
      ...other.match,
      home: {...other.match.home,name:'New Team',id:'new-tc-id'},
      away: {...other.match.away,name:'Different Team',id:'different-tc-id'},
    },
  }, FALLBACK_PREVIEW_BRANDING);
  assert.equal(snapshot.homeTeam.logo,'');
  assert.equal(snapshot.awayTeam.logo,'');
});
