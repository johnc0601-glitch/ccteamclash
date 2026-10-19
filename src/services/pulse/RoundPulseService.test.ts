import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import type {PulseSource} from './PulseFacts';
import {buildRoundPulse,copyRoundPulse} from './RoundPulseService';

const fixture = JSON.parse(readFileSync(new URL('./fixtures/round-one-2026.json',import.meta.url),'utf8')) as PulseSource;
const roundId=fixture.rounds.find(r=>r.number===1)!.id;
const run=(source=structuredClone(fixture))=>buildRoundPulse(source,roundId);

test('real 2026–27 Round 1 league totals reconcile with the published ledger',()=>{
  const before=JSON.stringify(fixture);
  const pulse=run(fixture);
  assert.equal(pulse.finalized,4);
  assert.equal(pulse.scheduled,4);
  assert.equal(pulse.complete,true);
  assert.equal(pulse.verified,true,JSON.stringify(pulse.warnings));
  assert.equal(pulse.homeWins,4);
  assert.equal(pulse.awayWins,0);
  assert.equal(pulse.biggest?.winner,'Ninjas');
  assert.equal(pulse.biggest?.margin,22.5);
  assert.equal(pulse.closest?.winner,'Riptide');
  assert.equal(pulse.closest?.margin,2.5);
  assert.equal(pulse.singles,70);
  assert.equal(pulse.doubles,35);
  assert.equal(pulse.upsetCount,21);
  assert.equal(pulse.upsetRate,20);
  assert.equal(pulse.points?.published,146);
  assert.equal(pulse.points?.playedSingles,70);
  assert.equal(pulse.points?.playedDoubles,70);
  assert.equal(pulse.points?.automatic,1);
  assert.equal(pulse.points?.awarded,5);
  assert.equal(pulse.points?.rosterNoShow,2);
  assert.equal(pulse.points?.womenBonus,2);
  assert.equal(pulse.points?.other,1);
  assert.equal(pulse.points?.unitemized,0);
  assert.equal(pulse.players,159);
  assert.equal(pulse.topGainers[0]?.name,'Hastin McGill');
  assert.equal(pulse.topGainers[0]?.change,25);
  assert.equal(pulse.topDecliners[0]?.name,'Derek Hynds');
  assert.equal(pulse.topDecliners[0]?.change,-23);
  assert.equal(JSON.stringify(fixture),before);
  assert.match(copyRoundPulse(pulse),/21 \(20% of played contests\)|21 \(20% of played contests\)/i);
});
test('future and unfinalized matches do not contribute to a round',()=>{
  const source=structuredClone(fixture);
  const live=source.results.find(r=>r.match_id===source.matches.find(m=>m.home_name==='Riptide'&&m.away_name==='Beast Mode')?.id)!;
  live.status='Draft';
  const pulse=run(source);
  assert.equal(pulse.finalized,3);
  assert.equal(pulse.complete,false);
  assert.equal(pulse.verified,false);
  assert.equal(pulse.upsetCount,null);
  assert.equal(pulse.players,null);
  assert.equal(pulse.homeWins,3);
  assert.ok(pulse.warnings.some(w=>w.includes('Partial round')));
});
test('a missing or stale frozen rating withholds player and upset counts, not team finals',()=>{
  const source=structuredClone(fixture);
  source.ratings.pop();
  const pulse=run(source);
  assert.equal(pulse.finalized,4);
  assert.equal(pulse.verified,false);
  assert.equal(pulse.upsetCount,null);
  assert.ok(pulse.matches.length===4);
});
test('no team-upset claim is invented without saved roster-lock predictions',()=>{
  const pulse=run();
  assert.deepEqual(pulse.teamUpsets,[]);
  assert.equal(pulse.biggestUpset?.format==='Doubles'||pulse.biggestUpset?.format==='Singles',true);
});
test('clipped automatic slot and bonus team points never create additional played contests',()=>{
  const source=structuredClone(fixture);
  source.adjustments=source.adjustments.map(a=>({...a,points:a.points+100}));
  const pulse=run(source);
  assert.equal(pulse.singles,70);
  assert.equal(pulse.doubles,35);
  assert.equal(pulse.verified,false); // published ledger no longer reconciles
});
