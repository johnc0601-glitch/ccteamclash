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
         home:{players:[player('Justin B')],points:0},result:{winner:'away',forfeitedBy:null as string|null}},
      ]},
      {name:'Doubles',points:{away:1.5,home:2},matchups:[
        {away:{players:[player('Luke Hahn'),player('Benjamin Grubbs')],points:0},
         home:{players:[player('Justin B'),player('Dillon Blunier')],points:2},result:{winner:'home',forfeitedBy:null as string|null}},
        {away:{players:[player('Misti Lee')],points:1},
         home:{players:[player('Currie Istre')],points:0},result:{winner:'away',forfeitedBy:null as string|null}},
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

test('updated official penalty ledger: short female + missing female and rostered player',()=>{
  const source: any=fixture();
  source.match.home.id='wb-riptide';
  source.match.away.id='wb-beast';
  source.rounds[0].penalties=[{
    against:'home',teamId:'wb-riptide',points:1,note:'Short Female',
  }];
  // Source Round 2 reports one additional female point plus half a
  // point for a rostered no-show, totaling 1.5 outside played contests.
  source.rounds[1].points.away=2.5;
  source.match.away.points=4.5;
  source.rounds[1].penalties=[{
    against:'home',teamId:'wb-riptide',points:1.5,note:'Missing Female and Rostered player',
  }];
  const result=prepareWhiteboardImport(source,match,players);
  assert.deepEqual(result.errors,[]);
  assert.equal(result.penalties.length,2);
  assert.equal(result.penalties.reduce((sum,p)=>sum+p.points,0),2.5);
  assert.deepEqual(result.awards.map(a=>[a.category,a.points]),[
    ['WomenBonus',1],['WomenBonus',1],['NoShow',.5],
  ]);
  assert.equal(result.awards.filter(a=>a.category==='WomenBonus').reduce((sum,a)=>sum+a.points,0),2);
  assert.ok(result.warnings.some(w=>w.includes('Confirm before saving')));
});

test('penalty ledger cannot disagree with matchups or award the wrong team',()=>{
  const source: any=fixture();
  source.match.home.id='wb-riptide';
  source.match.away.id='wb-beast';
  source.rounds[0].penalties=[{
    against:'away',teamId:'wb-beast',points:1,note:'Short Female',
  }];
  source.rounds[1].penalties=[{
    against:'home',teamId:'wb-riptide',points:.5,note:'Rostered no-show',
  }];
  const result=prepareWhiteboardImport(source,match,players);
  assert.ok(result.errors.some(e=>e.includes('penalty ledger does not match')));
});

test('incomplete new penalty ledger blocks import instead of inventing bonus points',()=>{
  const source: any=fixture();
  source.match.home.id='wb-riptide';
  source.match.away.id='wb-beast';
  source.rounds[0].penalties=[];
  source.rounds[1].penalties=[];
  const result=prepareWhiteboardImport(source,match,players);
  assert.equal(result.penalties.length,0);
  assert.ok(result.errors.some(e=>e.includes('penalty ledger does not match')));
});

test('unknown penalty language stays unclassified until commissioner review',()=>{
  const source: any=fixture();
  source.match.home.id='wb-riptide';
  source.match.away.id='wb-beast';
  source.rounds[0].penalties=[{against:'home',teamId:'wb-riptide',points:1,note:'Administrative adjustment'}];
  source.rounds[1].penalties=[{against:'home',teamId:'wb-riptide',points:.5,note:'Rostered no-show'}];
  const result=prepareWhiteboardImport(source,match,players);
  assert.deepEqual(result.errors,[]);
  assert.equal(result.awards.length,2);
  assert.ok(result.awards.every(a=>a.category==='Other'));
});
