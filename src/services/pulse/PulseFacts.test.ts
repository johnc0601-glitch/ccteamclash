import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {exportRoundFacts, generateRoundFacts, type PulseSource, type SavedPulseFact} from './PulseFacts';
import {generateStreakFacts} from './PulseStreaks';

// Read-only production capture on 2026-10-18, limited to public match statistics.
const fixture = JSON.parse(readFileSync(new URL('./fixtures/round-one-2026.json', import.meta.url), 'utf8')) as PulseSource;
const roundId = fixture.rounds[0].id;
const generate = (source = structuredClone(fixture)) => generateRoundFacts(source, roundId);
const metric = (key: string) => generate().facts.find(f => f.fact_key === key)?.metric;

test('2026–27 Round 1 independently reproduces all six acceptance figures', () => {
  assert.equal(generate().complete, true);
  assert.equal(generate().warnings.length, 1);
  assert.match(generate().warnings[0], /Streak coverage/);
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
test('export includes all fifth-place ties, excludes hidden/retired facts, labels editorial without approval steps', () => {
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
  assert.match(text, /\[Editorial\] Manual context/);
  assert.doesNotMatch(text, /Pending review/);
});

function streakSeason(outcomes: ('W' | 'L' | 'T' | 'Draft')[]) {
  const source = structuredClone(fixture);
  const template = source.matches.find(m => m.id === source.snapshots[0].match_id)!;
  const snapshot = source.snapshots[0].payload;
  const contest = snapshot.contests.find(c => c.format === 'Singles' && !c.unplayed && c.homePlayers.length === 1 && c.awayPlayers.length === 1)!;
  const homePlayer = source.ratings.find(r => r.match_id === template.id && r.contest_id === contest.id && r.side === 'Home')!;
  const awayPlayer = source.ratings.find(r => r.match_id === template.id && r.contest_id === contest.id && r.side === 'Away')!;
  source.rounds = outcomes.map((_,i) => ({...source.rounds[0], id: `round-${i}`, number: i + 1}));
  source.matches = outcomes.map((_,i) => ({...template, id: `match-${i}`, round_id: `round-${i}`, date: `2026-${String(i+1).padStart(2,'0')}-01`}));
  source.results = outcomes.map((o,i) => ({match_id: `match-${i}`, status: o === 'Draft' ? 'Draft' : 'Published', home_score: o === 'W' ? 20 : 10, away_score: o === 'L' ? 20 : 10}));
  source.ratings = outcomes.flatMap((o,i) => [
    {...homePlayer, match_id: `match-${i}`, outcome: o === 'Draft' ? 'W' as const : o},
    {...awayPlayer, match_id: `match-${i}`, outcome: o === 'W' || o === 'Draft' ? 'L' as const : o === 'L' ? 'W' as const : 'T' as const},
  ]);
  source.snapshots = outcomes.map((o,i) => ({match_id: `match-${i}`, locked: true,
    payload: {...snapshot, matchId: `match-${i}`, homeScore: source.results[i].home_score!, awayScore: source.results[i].away_score!,
      contests: [{...contest, homeOutcome: o === 'Draft' ? 'W' as const : o, awayOutcome: o === 'W' || o === 'Draft' ? 'L' as const : o === 'L' ? 'W' as const : 'T' as const}]}}));
  const round = source.rounds.at(-1)!;
  return {source, round, homePlayer, facts: () => generateStreakFacts(source, round, source.ratings)};
}

test('team and separate player-format winning streaks carry their complete source trail', () => {
  const {facts,homePlayer} = streakSeason(['W','W','W']);
  const team = facts().find(f => f.fact_key.includes('team:') && f.fact_key.includes(':winning:') && f.metric === 3)!;
  assert.match(team.fact_text, /3-match winning streak/);
  assert.deepEqual(team.sources.find(s => s.table === 'launch_match_results')!.ids, ['match-0','match-1','match-2']);
  assert.ok(facts().some(f => f.player_ids.includes(homePlayer.player_id) && /singles.*3-appearance winning/.test(f.fact_text)));
  assert.ok(!facts().some(f => /doubles/.test(f.fact_text)));
});

test('a loss ends a winning and unbeaten streak; a win ends losing and winless runs', () => {
  for (const outcomes of [['W','W','L'],['L','L','W']] as const) {
    const {facts} = streakSeason([...outcomes]);
    const broken = facts().filter(f => f.fact_key.includes('team:') && f.fact_text.includes('ended'));
    assert.equal(broken.length, 4); // Both teams, two kinds of run each.
    assert.ok(broken.every(f => f.metric === 2 && f.fact_text.includes('against')));
  }
});

test('ties end winning/losing runs but extend unbeaten/winless runs', () => {
  const {facts} = streakSeason(['W','W','T']);
  assert.ok(facts().some(f => /2-match winning streak ended with a tie/.test(f.fact_text)));
  assert.ok(facts().some(f => /3-match unbeaten streak through/.test(f.fact_text)));
});

test('missing and draft results interrupt runs instead of joining across a gap', () => {
  const state = streakSeason(['W','Draft','W']);
  assert.equal(state.facts().length, 0);
  state.source.results.splice(1,1);
  assert.equal(state.facts().length, 0);
});

test('future rounds, prior seasons and one-win runs never inflate streaks', () => {
  const state = streakSeason(['W','W','W']);
  state.source.matches[0].season_id = 'old-season';
  assert.ok(state.facts().filter(f => f.fact_key.includes('team:')).every(f => f.metric === 2));
  assert.equal(generateStreakFacts(state.source, state.source.rounds[1], state.source.ratings).length, 0);
});

test('unknown player participation breaks runs; a recorded absence skips an appearance', () => {
  const state = streakSeason(['W','W','W']);
  state.source.snapshots.splice(1,1);
  assert.ok(!state.facts().some(f => f.player_ids.length));
  const absent = streakSeason(['W','W','W']);
  absent.source.snapshots[1].payload.contests[0].unplayed = true;
  absent.source.ratings = absent.source.ratings.filter(r => r.match_id !== 'match-1');
  assert.ok(absent.facts().some(f => f.player_ids.length && f.metric === 2));
});

test('ambiguous same-round dates cannot invent a player or team ordering', () => {
  const state = streakSeason(['W','W','L']);
  state.source.matches[0].round_id = state.round.id;
  state.source.matches[0].date = state.source.matches[2].date;
  assert.equal(state.facts().length, 0);
});

test('full recap generation consumes earlier verified rounds without including their ordinary facts', () => {
  const source = structuredClone(fixture);
  const currentRound = source.rounds[0];
  source.rounds.unshift({...currentRound, id: 'prior', number: 0});
  const originals = source.matches.filter(m => m.round_id === currentRound.id);
  for (const match of originals) {
    const id = `prior-${match.id}`;
    source.matches.push({...match,id,round_id:'prior',date:'2026-09-01'});
    source.results.push({...source.results.find(r => r.match_id === match.id)!,match_id:id});
    const old = source.snapshots.find(s => s.match_id === match.id)!;
    source.snapshots.push({...old,match_id:id,payload:{...old.payload,matchId:id}});
    source.ratings.push(...source.ratings.filter(r => r.match_id === match.id).map(r => ({...r,match_id:id})));
  }
  const report = generateRoundFacts(source,currentRound.id);
  assert.equal(report.facts.filter(f => f.fact_key.startsWith('score:')).length,4);
  assert.ok(report.facts.some(f => f.category === 'Streaks' && f.player_ids.length && f.metric === 2));
  assert.ok(report.facts.some(f => f.category === 'Streaks' && !f.player_ids.length && f.metric === 2));
});
