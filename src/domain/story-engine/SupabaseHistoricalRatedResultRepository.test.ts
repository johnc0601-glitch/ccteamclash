import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {
  buildHistoricalRatedResultReport,
  buildHistoricalRatedResults,
  type HistoricalEventMetadataRow,
  type StoredHistoricalRatingFact,
} from './SupabaseHistoricalRatedResultRepository';

function fact(overrides: Partial<StoredHistoricalRatingFact> & Pick<StoredHistoricalRatingFact, 'matchup_deduplication_key' | 'player_id' | 'player_name' | 'team_id' | 'team_name' | 'opponent_team_id' | 'opponent_team_name' | 'side' | 'venue' | 'format' | 'outcome' | 'clash_index_before' | 'ci_delta'>): StoredHistoricalRatingFact {
  return {
    contest_id: 'c1', historical_match_key: 'match-1', season_id: 'coastal-clash-2025-2026',
    opponent_effective_ci: 950, win_probability: .5,
    actual_points: overrides.outcome === 'W' ? 1 : overrides.outcome === 'T' ? .5 : 0,
    expected_points: .5, algorithm_version: 'test-v1', ...overrides,
  };
}

function meta(key: string, eventOrder = 2, eventLabel = 'November'): HistoricalEventMetadataRow {
  return {
    deduplication_key: key,
    season_id: 'coastal-clash-2025-2026',
    season_name: '2025-2026',
    event_label: eventLabel,
    event_order: eventOrder,
  };
}

describe('buildHistoricalRatedResults', () => {
  it('preserves event metadata and player-level CI history', () => {
    const facts = [
      fact({matchup_deduplication_key: 'k1', player_id: 'p1', player_name: 'One', team_id: 't1', team_name: 'Team One', opponent_team_id: 't2', opponent_team_name: 'Team Two', side: 'Home', venue: 'Home', format: 'Singles', outcome: 'W', clash_index_before: 920, ci_delta: 8, win_probability: .35, opponent_effective_ci: 980, actual_points: 1, expected_points: .35}),
      fact({matchup_deduplication_key: 'k2', player_id: 'p2', player_name: 'Two', team_id: 't2', team_name: 'Team Two', opponent_team_id: 't1', opponent_team_name: 'Team One', side: 'Away', venue: 'Home', format: 'Singles', outcome: 'L', clash_index_before: 980, ci_delta: -8, win_probability: .65, opponent_effective_ci: 935, actual_points: 0, expected_points: .65}),
    ];
    const report = buildHistoricalRatedResultReport(facts, [meta('k1'), meta('k2')]);

    assert.equal(report.sourceFactRows, 2);
    assert.equal(report.sourceContests, 1);
    assert.equal(report.emittedContests, 1);
    assert.equal(report.quarantinedContests, 0);
    assert.equal(report.results.length, 2);
    assert.equal(report.results[0].seasonId, 'coastal-clash-2025-2026');
    assert.equal(report.results[0].seasonName, '2025-2026');
    assert.equal(report.results[0].eventId, 'historical:coastal-clash-2025-2026:event-2');
    assert.equal(report.results[0].eventLabel, 'November');
    assert.equal(report.results[0].eventOrder, 2);
    assert.equal(report.results[0].venue, 'Home');
    assert.deepEqual(report.results[0].subjectCiBefore, [920]);
    assert.deepEqual(report.results[0].subjectCiAfter, [928]);
    assert.deepEqual(report.results[0].subjectCiDeltas, [8]);
    assert.notEqual(report.results[0].ciHistoryReliable, false);
  });

  it('keeps neutral playoffs neutral while assigning only a deterministic internal side', () => {
    const facts = [
      fact({matchup_deduplication_key: 'k1', player_id: 'p1', player_name: 'One', team_id: 't1', team_name: 'Team One', opponent_team_id: 't2', opponent_team_name: 'Team Two', side: null, venue: 'Neutral', format: 'Singles', outcome: 'W', clash_index_before: 960, ci_delta: 6}),
      fact({matchup_deduplication_key: 'k2', player_id: 'p2', player_name: 'Two', team_id: 't2', team_name: 'Team Two', opponent_team_id: 't1', opponent_team_name: 'Team One', side: null, venue: 'Neutral', format: 'Singles', outcome: 'L', clash_index_before: 955, ci_delta: -6}),
    ];
    const rows = buildHistoricalRatedResults(facts, [meta('k1', 7, 'March Championship'), meta('k2', 7, 'March Championship')]);
    assert.deepEqual(rows.map((row) => row.venue), ['Neutral', 'Neutral']);
    assert.deepEqual(new Set(rows.map((row) => row.side)), new Set(['Home', 'Away']));
  });

  it('quarantines an entire partial doubles contest instead of using only one side', () => {
    const facts = [
      fact({matchup_deduplication_key: 'k1', player_id: 'p1', player_name: 'One', team_id: 't1', team_name: 'Team One', opponent_team_id: 't2', opponent_team_name: 'Team Two', side: 'Home', venue: 'Home', format: 'Doubles', outcome: 'W', clash_index_before: 1000, ci_delta: 5}),
      fact({matchup_deduplication_key: 'k2', player_id: 'p2', player_name: 'Two', team_id: 't2', team_name: 'Team Two', opponent_team_id: 't1', opponent_team_name: 'Team One', side: 'Away', venue: 'Home', format: 'Doubles', outcome: 'L', clash_index_before: 950, ci_delta: -2}),
      fact({matchup_deduplication_key: 'k3', player_id: 'p3', player_name: 'Three', team_id: 't2', team_name: 'Team Two', opponent_team_id: 't1', opponent_team_name: 'Team One', side: 'Away', venue: 'Home', format: 'Doubles', outcome: 'L', clash_index_before: 940, ci_delta: -3}),
    ];
    const report = buildHistoricalRatedResultReport(facts, [meta('k1'), meta('k2'), meta('k3')]);
    assert.deepEqual(report.results, []);
    assert.equal(report.diagnostics.length, 1);
    assert.equal(report.diagnostics[0].reason, 'unexpected-player-count');
  });

  it('quarantines a contest containing three team ids and reports the defect', () => {
    const facts = [
      fact({matchup_deduplication_key: 'k1', player_id: 'p1', player_name: 'One', team_id: 't1', team_name: 'Team One', opponent_team_id: 't3', opponent_team_name: 'Team Three', side: 'Away', venue: 'Home', format: 'Doubles', outcome: 'L', clash_index_before: 900, ci_delta: -5}),
      fact({matchup_deduplication_key: 'k2', player_id: 'p2', player_name: 'Two', team_id: 't2', team_name: 'Team Two', opponent_team_id: 't3', opponent_team_name: 'Team Three', side: 'Away', venue: 'Home', format: 'Doubles', outcome: 'L', clash_index_before: 910, ci_delta: -5}),
      fact({matchup_deduplication_key: 'k3', player_id: 'p3', player_name: 'Three', team_id: 't3', team_name: 'Team Three', opponent_team_id: 't2', opponent_team_name: 'Team Two', side: 'Home', venue: 'Home', format: 'Doubles', outcome: 'W', clash_index_before: 920, ci_delta: 5}),
      fact({matchup_deduplication_key: 'k4', player_id: 'p4', player_name: 'Four', team_id: 't3', team_name: 'Team Three', opponent_team_id: 't2', opponent_team_name: 'Team Two', side: 'Home', venue: 'Home', format: 'Doubles', outcome: 'W', clash_index_before: 930, ci_delta: 5}),
    ];
    const report = buildHistoricalRatedResultReport(facts, [meta('k1'), meta('k2'), meta('k3'), meta('k4')]);
    assert.equal(report.emittedContests, 0);
    assert.equal(report.quarantinedContests, 1);
    assert.equal(report.diagnostics[0].reason, 'unexpected-team-count');
  });

  it('marks the affected player Matchday CI unreliable while retaining other valid contest stories', () => {
    const facts = [
      fact({contest_id: 'singles-good', matchup_deduplication_key: 's1', player_id: 'p1', player_name: 'One', team_id: 't1', team_name: 'Team One', opponent_team_id: 't2', opponent_team_name: 'Team Two', side: 'Home', venue: 'Home', format: 'Singles', outcome: 'W', clash_index_before: 920, ci_delta: 8}),
      fact({contest_id: 'singles-good', matchup_deduplication_key: 's2', player_id: 'p2', player_name: 'Two', team_id: 't2', team_name: 'Team Two', opponent_team_id: 't1', opponent_team_name: 'Team One', side: 'Away', venue: 'Home', format: 'Singles', outcome: 'L', clash_index_before: 980, ci_delta: -8}),
      fact({contest_id: 'doubles-bad', matchup_deduplication_key: 'd1', player_id: 'p1', player_name: 'One', team_id: 't1', team_name: 'Team One', opponent_team_id: 't3', opponent_team_name: 'Team Three', side: 'Away', venue: 'Home', format: 'Doubles', outcome: 'L', clash_index_before: 920, ci_delta: -4}),
      fact({contest_id: 'doubles-bad', matchup_deduplication_key: 'd2', player_id: 'p3', player_name: 'Three', team_id: 't2', team_name: 'Team Two', opponent_team_id: 't3', opponent_team_name: 'Team Three', side: 'Away', venue: 'Home', format: 'Doubles', outcome: 'L', clash_index_before: 930, ci_delta: -4}),
      fact({contest_id: 'doubles-bad', matchup_deduplication_key: 'd3', player_id: 'p4', player_name: 'Four', team_id: 't3', team_name: 'Team Three', opponent_team_id: 't2', opponent_team_name: 'Team Two', side: 'Home', venue: 'Home', format: 'Doubles', outcome: 'W', clash_index_before: 940, ci_delta: 4}),
      fact({contest_id: 'doubles-bad', matchup_deduplication_key: 'd4', player_id: 'p5', player_name: 'Five', team_id: 't3', team_name: 'Team Three', opponent_team_id: 't2', opponent_team_name: 'Team Two', side: 'Home', venue: 'Home', format: 'Doubles', outcome: 'W', clash_index_before: 950, ci_delta: 4}),
    ];
    const metadata = ['s1', 's2', 'd1', 'd2', 'd3', 'd4'].map((key) => meta(key));
    const report = buildHistoricalRatedResultReport(facts, metadata);

    assert.equal(report.emittedContests, 1);
    assert.equal(report.quarantinedContests, 1);
    const p1 = report.results.find((row) => row.subjectPlayerIds.includes('p1'));
    const p2 = report.results.find((row) => row.subjectPlayerIds.includes('p2'));
    assert.ok(p1);
    assert.ok(p2);
    assert.equal(p1.ciHistoryReliable, false);
    assert.notEqual(p2.ciHistoryReliable, false);
  });
});
