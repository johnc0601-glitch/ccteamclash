import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {buildRatedResultsFromStoredFacts, type StoredContestRatingFact} from './SupabaseRatedResultRepository';

const published = [{match_id: 'm1', published_at: '2026-10-03T18:00:00Z'}];
const schedules = [{
  id: 'm1', round_id: 'round-1', season_id: '2026-27', date: '2026-10-03',
  home_team_id: 'home', away_team_id: 'away',
}];
const rounds = [{id: 'round-1', season_id: '2026-27', number: 1, name: 'October', date: '2026-10-03'}];
const seasons = [{id: '2026-27', name: '2026-2027'}];

function fact(overrides: Partial<StoredContestRatingFact> & Pick<StoredContestRatingFact, 'player_id' | 'team_id' | 'player_name' | 'team_name' | 'side' | 'outcome' | 'clash_index_before' | 'ci_delta'>): StoredContestRatingFact {
  return {
    contest_id: 'c1', match_id: 'm1', venue: 'Home', format: 'Singles', opponent_effective_ci: 950,
    win_probability: .5, actual_points: overrides.outcome === 'W' ? 1 : overrides.outcome === 'T' ? .5 : 0,
    expected_points: .5, algorithm_version: 'test-v1', ...overrides,
  };
}

describe('buildRatedResultsFromStoredFacts', () => {
  it('adapts frozen singles facts with venue and human-facing event metadata', () => {
    const rows = buildRatedResultsFromStoredFacts(published, schedules, [
      fact({player_id: 'p1', player_name: 'One', team_id: 'home', team_name: 'Home Team', side: 'Home', outcome: 'W', clash_index_before: 910, ci_delta: 8, win_probability: .37, opponent_effective_ci: 980, actual_points: 1, expected_points: .37}),
      fact({player_id: 'p2', player_name: 'Two', team_id: 'away', team_name: 'Away Team', side: 'Away', outcome: 'L', clash_index_before: 980, ci_delta: -8, win_probability: .63, opponent_effective_ci: 910, actual_points: 0, expected_points: .63}),
    ], rounds, seasons);

    assert.equal(rows.length, 2);
    const home = rows.find((row) => row.side === 'Home');
    assert.ok(home);
    assert.equal(home.eventId, 'round-1');
    assert.equal(home.seasonId, '2026-27');
    assert.equal(home.seasonName, '2026-2027');
    assert.equal(home.eventLabel, 'October');
    assert.equal(home.eventOrder, 1);
    assert.equal(home.playedAt, '2026-10-03');
    assert.equal(home.venue, 'Home');
    assert.deepEqual(home.subjectPlayerIds, ['p1']);
    assert.deepEqual(home.subjectCiBefore, [910]);
    assert.deepEqual(home.subjectCiAfter, [918]);
    assert.deepEqual(home.subjectCiDeltas, [8]);
    assert.equal(home.winProbability, .37);
    assert.equal(home.opponentTeamName, 'Away Team');
    assert.equal(home.modelVersion, 'test-v1');
  });

  it('creates player-aligned doubles snapshots and one aggregate side delta', () => {
    const rows = buildRatedResultsFromStoredFacts(published, schedules, [
      fact({player_id: 'p1', player_name: 'One', team_id: 'home', team_name: 'Home Team', side: 'Home', format: 'Doubles', outcome: 'W', clash_index_before: 1000, ci_delta: 5}),
      fact({player_id: 'p2', player_name: 'Two', team_id: 'home', team_name: 'Home Team', side: 'Home', format: 'Doubles', outcome: 'W', clash_index_before: 900, ci_delta: 7}),
      fact({player_id: 'p3', player_name: 'Three', team_id: 'away', team_name: 'Away Team', side: 'Away', format: 'Doubles', outcome: 'L', clash_index_before: 950, ci_delta: -5}),
      fact({player_id: 'p4', player_name: 'Four', team_id: 'away', team_name: 'Away Team', side: 'Away', format: 'Doubles', outcome: 'L', clash_index_before: 940, ci_delta: -7}),
    ]);
    const home = rows.find((row) => row.side === 'Home');
    assert.ok(home);
    assert.deepEqual(home.subjectPlayerIds, ['p1', 'p2']);
    assert.deepEqual(home.subjectCiBefore, [1000, 900]);
    assert.deepEqual(home.subjectCiAfter, [1005, 907]);
    assert.deepEqual(home.subjectCiDeltas, [5, 7]);
    assert.equal(home.subjectEffectiveCi, 980);
    assert.equal(home.ciDelta, 12);
    assert.equal(home.venue, 'Home');
  });

  it('preserves neutral venue so later home/road triggers can exclude it', () => {
    const rows = buildRatedResultsFromStoredFacts(published, schedules, [
      fact({player_id: 'p1', player_name: 'One', team_id: 'home', team_name: 'Home Team', side: 'Home', venue: 'Neutral', outcome: 'W', clash_index_before: 910, ci_delta: 8}),
      fact({player_id: 'p2', player_name: 'Two', team_id: 'away', team_name: 'Away Team', side: 'Away', venue: 'Neutral', outcome: 'L', clash_index_before: 980, ci_delta: -8}),
    ]);
    assert.deepEqual(rows.map((row) => row.venue), ['Neutral', 'Neutral']);
  });

  it('omits a partial doubles side instead of inventing a missing partner', () => {
    const rows = buildRatedResultsFromStoredFacts(published, schedules, [
      fact({player_id: 'p1', player_name: 'One', team_id: 'home', team_name: 'Home Team', side: 'Home', format: 'Doubles', outcome: 'W', clash_index_before: 1000, ci_delta: 5}),
      fact({player_id: 'p3', player_name: 'Three', team_id: 'away', team_name: 'Away Team', side: 'Away', format: 'Doubles', outcome: 'L', clash_index_before: 950, ci_delta: -5}),
      fact({player_id: 'p4', player_name: 'Four', team_id: 'away', team_name: 'Away Team', side: 'Away', format: 'Doubles', outcome: 'L', clash_index_before: 940, ci_delta: -7}),
    ]);
    assert.deepEqual(rows.map((row) => row.side), ['Away']);
  });
});
