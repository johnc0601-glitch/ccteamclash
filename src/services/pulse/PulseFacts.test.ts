import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {exportRoundFacts, generateRoundFacts, type PulseSource, type SavedPulseFact} from './PulseFacts';

// Read-only production capture on 2026-10-18, limited to public match statistics.
const fixture = JSON.parse(readFileSync(new URL('./fixtures/round-one-2026.json', import.meta.url), 'utf8')) as PulseSource;
const roundId = fixture.rounds[0].id;
const generate = (source = structuredClone(fixture)) => generateRoundFacts(source, roundId);
const metric = (key: string) => generate().facts.find(f => f.fact_key === key)?.metric;

test('2026–27 Round 1 independently reproduces all six acceptance figures', () => {
  assert.equal(generate().complete, true);
  assert.deepEqual(generate().warnings.filter(w => !w.startsWith('Streaks use only the selected season')), []);
  assert.equal(metric('round:upsets'), 21);
  assert.equal(metric('round:both'), 31);
  assert.equal(metric('round:perfect-losing'), 8);
  assert.equal(metric('ci:hastin-mcgill'), 25);
  assert.equal(metric('team-ci:beast-mode'), 40);
  assert.equal(metric('round:home-away'), 4);
  assert.match(generate().facts.find(f => f.fact_key === 'round:upsets')!.fact_text, /105 played contests \(20.0%\)/);
  assert.equal(generate().facts.filter(f => f.fact_key.startsWith('score:')).length, 4);
  assert.equal(generate().facts.filter(f => f.category === 'Upcoming').length, 4);
});
test('generation is deterministic and never mutates locked snapshots or ratings', () => {
  const before = JSON.stringify(fixture);
  assert.deepEqual(generate(fixture), generate(fixture));
  assert.equal(JSON.stringify(fixture), before);
});
test('draft matches never contribute facts; round totals wait for all four results', () => {
  const source = structuredClone(fixture);
  source.results[0].status = 'Draft';
  const result = generate(source);
  assert.equal(result.complete, false);
  assert.equal(result.finalized, 3);
  assert.ok(!result.facts.some(f => f.category === 'Round'));
  assert.ok(!result.facts.some(f => f.category === 'Match' && f.match_id === source.results[0].match_id));
});
test('unplayed contests cannot produce individual upsets, wins or CI movement', () => {
  const source = structuredClone(fixture);
  const contest = source.snapshots[0].payload.contests[0];
  contest.unplayed = true;
  const result = generate(source);
  assert.ok(!result.facts.some(f => f.fact_key.includes(`upset:${source.snapshots[0].match_id}:${contest.id}`)));
  const affected = source.ratings.filter(r => r.contest_id === contest.id);
  for (const row of affected) {
    const delta = source.ratings.filter(r => r.player_id === row.player_id && r.contest_id !== contest.id).reduce((n,r) => n+r.ci_delta,0);
    assert.equal(result.facts.find(f => f.fact_key === `ci:${row.player_id}`)?.metric, delta);
  }
});
test('missing, conflicting and invalid frozen probabilities withhold complete round statistics', () => {
  for (const change of ['missing','duplicate','invalid'] as const) {
    const source = structuredClone(fixture);
    if (change === 'missing') source.ratings.shift();
    if (change === 'duplicate') source.ratings.push({...source.ratings[0]});
    if (change === 'invalid') source.ratings[0].win_probability = NaN;
    const result = generate(source);
    assert.equal(result.complete, false, change);
    assert.ok(result.warnings.some(w => w.includes('ratings')), change);
    assert.ok(!result.facts.some(f => f.fact_key === 'round:upsets'), change);
  }
});
test('published scoring adjustments cannot inflate player CI or wins', () => {
  const source = structuredClone(fixture);
  source.adjustments.forEach(a => {a.points += 100;});
  assert.equal(generate(source).facts.find(f => f.fact_key === 'ci:hastin-mcgill')?.metric, 25);
  assert.equal(generate(source).facts.find(f => f.fact_key === 'round:both')?.metric, 31);
});
test('snapshot mismatches never silently reuse corrected player statistics', () => {
  const source = structuredClone(fixture);
  source.snapshots[0].payload.homeScore += 1;
  const result = generate(source);
  assert.equal(result.complete, false);
  assert.ok(result.warnings.some(w => w.includes('inconsistent locked snapshot')));
});
test('team odds need complete frozen rosters and distinguish reconstruction from saved forecast', () => {
  assert.ok(generate().facts.filter(f => f.fact_key.startsWith('projection:')).every(f => f.calculation.includes('Historical reconstruction')));
  const source = structuredClone(fixture);
  source.frozenRatings = [];
  assert.equal(generate(source).facts.filter(f => f.fact_key.startsWith('projection:')).length, 0);
  assert.ok(generate(source).warnings.some(w => w.includes('team win probability withheld')));
});
test('prior-season rematches are sourced even without exact dates; future records are excluded', () => {
  const source = structuredClone(fixture);
  const match = source.matches.find(m => m.round_id === roundId)!;
  source.history = [{id: 999, season_name: '2025-2026', event_label: 'November', played_on: null,
    home_team_name: match.home_name, away_team_name: match.away_name, home_score: 20, away_score: 16},
    {id: 1000, season_name: '2027-2028', event_label: 'November', played_on: null,
      home_team_name: match.home_name, away_team_name: match.away_name, home_score: 20, away_score: 16}];
  const historical = generate(source).facts.filter(f => f.category === 'History');
  assert.equal(historical.length, 1);
  assert.match(historical[0].fact_text, /exact date not recorded/);
  assert.deepEqual(historical[0].sources[0].ids, ['999']);
});
test('export includes all fifth-place ties, excludes hidden/retired facts, labels pending editorial', () => {
  const base = generate().facts.find(f => f.category === 'CI movement')!;
  const facts: SavedPulseFact[] = [10,9,8,7,6,6,5,-10,-9,-8,-7,-6,-6,-5].map((n,i) => ({...base,
    id: String(i), fact_key: String(i), fact_text: `mover-${i}`, metric: n, status: 'approved',
    origin: 'generated', is_current: true, generated_at: '2026-10-18', featured_item_id: null}));
  facts.push({...facts[0], id: 'hidden', fact_text: 'HIDDEN FACT', status: 'hidden'});
  facts.push({...facts[0], id: 'retired', fact_text: 'RETIRED FACT', is_current: false});
  facts.push({...facts[0], id: 'editorial', category: 'Editorial', fact_text: 'Manual context', origin: 'editorial', status: 'pending'});
  const text = exportRoundFacts('Round 1', facts);
  assert.match(text, /mover-5\n/); assert.match(text, /mover-12\n/);
  assert.doesNotMatch(text, /mover-6\n|mover-13\n|HIDDEN FACT|RETIRED FACT/);
  assert.match(text, /\[Editorial\] \[Pending review\] Manual context/);
});
