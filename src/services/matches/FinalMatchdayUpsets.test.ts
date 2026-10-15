import assert from 'node:assert/strict';
import test from 'node:test';
import {getVerifiedUpsets} from './FinalMatchdayUpsets';
import type {FinalMatchdaySnapshot} from './FinalMatchdaySnapshot';
import type {PublishedUpsetMatch} from './FinalMatchdayUpsets';

function fixture(): Pick<FinalMatchdaySnapshot,'date'|'matchId'|'homeTeam'|'awayTeam'|'contests'> {
 return {
  matchId:'tcwhiteboard-123',date:'2026-10-10',
  homeTeam:{id:'tc-nin',name:'Ninjas',shortName:'NIN',logo:'',primaryColor:null,secondaryColor:null},
  awayTeam:{id:'tc-og',name:'Hayneous OG’s',shortName:'HOS',logo:'',primaryColor:null,secondaryColor:null},
  contests:[
   {id:'s1',format:'Singles',position:1,homeOutcome:'W',awayOutcome:'L',
    homePlayers:[{id:'h1',name:'Steven McCarty'}],awayPlayers:[{id:'a1',name:'Jake Lehmann'}]},
   {id:'d1',format:'Doubles',position:1,homeOutcome:'W',awayOutcome:'L',
    homePlayers:[{id:'h2',name:'J Baus'},{id:'h3',name:'Marcus Kinsman'}],
    awayPlayers:[{id:'a2',name:'Austin Gratton'},{id:'a3',name:'Jake Lehmann'}]},
   {id:'s4',format:'Singles',position:4,homeOutcome:'T',awayOutcome:'T',unplayed:true,
    homePlayers:[{id:'h4',name:'Andrew Wilson'}],awayPlayers:[]},
   {id:'s5',format:'Singles',position:5,homeOutcome:'T',awayOutcome:'T',
    homePlayers:[{id:'h5',name:'Nick'}],awayPlayers:[{id:'a5',name:'Joe'}]},
  ],
 };
}
const published:PublishedUpsetMatch[]=[{
 matchId:'canonical-league-match',date:'2026-10-10',
 homeTeamName:'Ninjas',awayTeamName:"Hayneous OG's",
 contests:[
  {format:'Singles',position:15,homePlayers:['Steven McCarty'],awayPlayers:['Jake Lehmann'],winner:'Home',winningProbability:.2199},
  {format:'Doubles',position:1,homePlayers:['Marcus Kinsman','J Baus'],awayPlayers:['Jake Lehmann','Austin Gratton'],winner:'Home',winningProbability:.44},
  {format:'Singles',position:4,homePlayers:['Andrew Wilson'],awayPlayers:['Conner Garrett'],winner:'Home',winningProbability:.1},
  {format:'Singles',position:5,homePlayers:['Nick'],awayPlayers:['Joe'],winner:'Home',winningProbability:.04},
 ]}];

test('matches unique public published frozen probability by team, date, participants, and position',()=>{
 const matched=getVerifiedUpsets(fixture(),published);
 assert.deepEqual(Object.keys(matched).sort(),['Doubles:1','Singles:1']);
 assert.equal(matched['Singles:1'].label,'Upset · 22%');
 assert.equal(matched['Doubles:1'].label,'Upset · 44%');
 assert.equal(matched['Doubles:1'].side,'Home');
});

test('no upset for a missing player, a changed winner, an unplayed position, or ties',()=>{
 const modified=fixture();
 modified.contests[0].awayPlayers[0].name='Another player';
 modified.contests[1].homeOutcome='L';
 modified.contests[1].awayOutcome='W';
 const found=getVerifiedUpsets(modified,published);
 assert.deepEqual(found,{});
});

test('never label a favourite win even if its score margin is dramatic',()=>{
 const rows=[{...published[0],contests:published[0].contests.map(x=>({...x,winningProbability:.6}))}];
 assert.deepEqual(getVerifiedUpsets(fixture(),rows),{});
});

test('do not attach an upset to the wrong date, team or ambiguous canonical match',()=>{
 const data=fixture();
 assert.deepEqual(getVerifiedUpsets({...data,date:'2026-10-11'},published),{});
 assert.deepEqual(getVerifiedUpsets({...data,awayTeam:{...data.awayTeam,name:'KB'}},published),{});
 assert.deepEqual(getVerifiedUpsets(data,[...published,...published]),{});
});

test('duplicate evidence for the same two sides does not produce a badge',()=>{
 const [match]=published;
 const contested={...match,contests:[...match.contests, {...match.contests[0],position:55}]};
 const upset=getVerifiedUpsets(fixture(),[contested]);
 assert.equal(upset['Singles:1'],undefined);
 assert.ok(upset['Doubles:1']);
});
