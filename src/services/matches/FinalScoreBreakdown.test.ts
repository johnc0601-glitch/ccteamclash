import assert from 'node:assert/strict';
import test from 'node:test';
import {buildFinalScoreBreakdown, displaySinglesRows} from './FinalScoreBreakdown';
import type {FinalMatchContest, FinalMatchdayV2Snapshot} from './FinalMatchdayCanary';

function contest(format: 'Singles' | 'Doubles', position: number, homeOutcome: 'W' | 'L' | 'T'): FinalMatchContest {
  return {
    id: `${format}-${position}`,
    format, position,
    homeOutcome,
    awayOutcome: homeOutcome === 'W' ? 'L' : homeOutcome === 'L' ? 'W' : 'T',
    homePlayers: [{id: `ninjas-${position}`, name: 'Ninjas player'}],
    awayPlayers: [{id: `ogs-${position}`, name: 'OGs player'}],
  };
}

function sample(adjustments: FinalMatchdayV2Snapshot['adjustments'], homeScore = 30): Pick<FinalMatchdayV2Snapshot, 'awayTeam' | 'homeTeam' | 'awayScore' | 'homeScore' | 'contests' | 'adjustments'> {
  // Ninjas–OG's: 17 played singles worth 13.5–3.5; 9 doubles worth 14–4.
  const singles = [
    ...Array.from({length: 13}, (_, i) => contest('Singles', i < 5 ? i + 1 : i + 2, 'W')),
    ...Array.from({length: 3}, (_, i) => contest('Singles', i + 15, 'L')),
    contest('Singles', 18, 'T'),
  ];
  // Make an explicit position 6 gap without changing recorded scoring.
  const doubles = [
    ...Array.from({length: 7}, (_, i) => contest('Doubles', i + 1, 'W')),
    ...Array.from({length: 2}, (_, i) => contest('Doubles', i + 8, 'L')),
  ];
  return {
    homeTeam: {id:'ninjas', name:'Ninjas', shortName:'NIN', logo:'', primaryColor:null, secondaryColor:null},
    awayTeam: {id:'ogs', name:'Hayneous OGs', shortName:'OG', logo:'', primaryColor:null, secondaryColor:null},
    homeScore, awayScore: 7.5,
    contests: [...singles, ...doubles],
    adjustments,
  };
}

test('unplayed singles allocation and no-show penalties reconcile without adding player results', () => {
  const match = sample([
    {awardedTeamId:'ninjas', category:'UnplayedSlot', points:1, note:'Unplayed position 6'},
    {awardedTeamId:'ninjas', category:'NoShow', points:1.5, note:'Roster penalties'},
  ]);
  const scores = buildFinalScoreBreakdown(match);
  assert.deepEqual(scores.playedSingles, {away:3.5,home:13.5});
  assert.deepEqual(scores.singles, {away:3.5,home:14.5});
  assert.deepEqual(scores.doubles, {away:4,home:14});
  assert.deepEqual(scores.otherAdjustments,{away:0,home:1.5});
  assert.equal(scores.balanced,true);
  const rows = displaySinglesRows(match.contests,1);
  assert.equal(rows.find((row)=>row.position===6)?.unplayed,true);
  assert.deepEqual(rows.find((row)=>row.position===6)?.awayPlayers,[]);
  assert.equal(rows.filter((row)=>!row.unplayed).length,17);
});

test('does not infer unplayed slots from an unmatched point count', () => {
  const match = sample([],30);
  assert.equal(displaySinglesRows(match.contests,2).filter((row)=>row.unplayed).length,0);
});

test('legacy snapshot reports unexplained scores instead of guessing they are penalties', () => {
  const scores = buildFinalScoreBreakdown(sample([],30));
  assert.deepEqual(scores.unitemized,{away:0,home:2.5});
  assert.equal(scores.balanced,false);
});

test('display-only unplayed rows never accumulate CI or score points', () => {
  const match = sample([],28.5);
  match.contests.push({
    id:'unplayed-6', format:'Singles', position:6, awayOutcome:'L', homeOutcome:'W',
    awayPlayers:[],homePlayers:[],unplayed:true,
  });
  const scores = buildFinalScoreBreakdown(match);
  assert.equal(scores.playedSingles.home,13.5);
  assert.equal(scores.unitemized.home,1);
});


test('women bonuses are itemized separately from singles, doubles and no-shows', () => {
  const match = sample([
    {awardedTeamId:'ninjas', category:'UnplayedSlot', points:1, note:null},
    {awardedTeamId:'ninjas', category:'WomenBonus', points:1, note:'Verified bonus'},
    {awardedTeamId:'ninjas', category:'NoShow', points:.5, note:'Rostered absence'},
  ]);
  const totals = buildFinalScoreBreakdown(match);
  assert.equal(totals.singles.home,14.5);
  assert.equal(totals.otherAdjustments.home,1.5);
  assert.equal(totals.balanced,true);
});

test('unexplained or negative difference blocks a balanced audit', () => {
  const totals = buildFinalScoreBreakdown(sample([{awardedTeamId:'ninjas',category:'NoShow',points:3,note:null}],30));
  assert.equal(totals.unitemized.home,-.5);
  assert.equal(totals.balanced,false);
});
