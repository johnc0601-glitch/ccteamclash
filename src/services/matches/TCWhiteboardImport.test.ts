import assert from 'node:assert/strict';
import test from 'node:test';
import {prepareWhiteboardImport, type WhiteboardImportMatch, type WhiteboardImportPlayer} from './TCWhiteboardImport';

const match: WhiteboardImportMatch = {
  id:'beast-at-riptide',date:'2026-10-17',
  homeTeamId:'riptide',awayTeamId:'beast-mode',
  homeTeamName:'Riptide',awayTeamName:'Beast Mode',
};
const players: WhiteboardImportPlayer[] = [
  {id:'ben-grubbs',name:'Ben Grubbs',teamId:'beast-mode'},
  {id:'misti-lee',name:'Misti Lee',teamId:'beast-mode'},
  {id:'luke-hahn',name:'Luke Hahn',teamId:'beast-mode'},
  {id:'justin-brady',name:'Justin Brady',teamId:'riptide'},
  {id:'currie-istre',name:'Currie Istre',teamId:'riptide'},
  {id:'dillon-blunier',name:'Dillon Blunier',teamId:'riptide'},
  {id:'javan-2',name:'Javan Smith',teamId:'riptide'},
];
const player=(name:string)=>({name,pdgaNumber:null});
function fixture(){
  return {
    schema:'tcwhiteboard.match/v1',
    match: {
      id:'f4m09qxvri1hredzcoafzbst',status:'final',
      date:'2026-10-17',home:{name:'Riptide',points:2},
      away:{name:'Beast Mode',points:3.5},
    },
    rounds: [
      {name:'Singles',points:{away:2,home:0},matchups:[
        {away:{players:[player('Benjamin Grubbs')],points:1},
         home:{players:[player('Justin B')],points:0},result:{winner:'away',forfeitedBy:null}},
      ]},
      {name:'Doubles',points:{away:1.5,home:2},matchups:[
        {away:{players:[player('Luke Hahn'),player('Benjamin Grubbs')],points:0},
         home:{players:[player('Justin B'),player('Dillon Blunier')],points:2},result:{winner:'home',forfeitedBy:null}},
        {away:{players:[player('Misti Lee')],points:1},
         home:{players:[player('Currie Istre')],points:0},result:{winner:'away',forfeitedBy:null}},
      ]},
    ],
  };
}

test('maps mixed one-on-one match in doubles round to real singles CI format, not phantom doubles',()=>{
  const result=prepareWhiteboardImport(fixture(),match,players);
  assert.deepEqual(result.errors,[]);
  assert.equal(result.contests.filter(c=>c.format==='Singles').length,2);
  assert.equal(result.contests.filter(c=>c.format==='Doubles').length,1);
  assert.deepEqual(result.roundAdjustments,[{round:1,away:1,home:0},{round:2,away:.5,home:0}]);
  assert.equal(result.homeScore,2);
  assert.equal(result.awayScore,3.5);
  assert.ok(result.aliasMatches.some(x=>x.includes('Justin B')));
  assert.ok(result.aliasMatches.some(x=>x.includes('Benjamin Grubbs')));
  assert.ok(result.warnings.some(x=>x.includes('1v1')));
  assert.ok(result.contests.every(c=>c.players.every(p=>p.playerId!=='')));
});

test('rejects incorrect fixture, nonfinal source, mismatched round totals and missing roster player',()=>{
  const source=fixture();
  source.match.status='in_progress';
  source.match.date='2026-10-10';
  source.rounds[0].points.away=1;
  const result=prepareWhiteboardImport(source,match,players.filter(p=>p.id!=='currie-istre'));
  assert.ok(result.errors.some(x=>x.includes('not finalized')));
  assert.ok(result.errors.some(x=>x.includes('date')));
  assert.ok(result.errors.some(x=>x.includes('Unmatched')));
  assert.ok(result.errors.some(x=>x.includes('Rounds do not sum')));
});

test('rejects accidental cross-match import before any save',()=>{
  const result=prepareWhiteboardImport(fixture(),{...match,homeTeamName:'Ninjas'},players);
  assert.ok(result.errors.some(x=>x.includes('Home/away teams')));
});

test('refuses to invent played contests for a forfeit',()=>{
  const source=fixture();
  source.rounds[0].matchups[0].result.forfeitedBy='home';
  const result=prepareWhiteboardImport(source,match,players);
  assert.ok(result.errors.some(x=>x.includes('Forfeit requires manual review')));
  assert.equal(result.contests.filter(c=>c.format==='Singles').length,1);
});
