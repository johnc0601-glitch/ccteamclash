import {describe, expect, it} from 'vitest';
import {
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
    const rows = buildHistoricalRatedResults(facts, [meta('k1'), meta('k2')]);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      seasonId: 'coastal-clash-2025-2026', seasonName: '2025-2026',
      eventId: 'historical:coastal-clash-2025-2026:event-2', eventLabel: 'November', eventOrder: 2,
      venue: 'Home', subjectCiBefore: [920], subjectCiAfter: [928], subjectCiDeltas: [8],
    });
  });

  it('keeps neutral playoffs neutral while assigning only a deterministic internal side', () => {
    const facts = [
      fact({matchup_deduplication_key: 'k1', player_id: 'p1', player_name: 'One', team_id: 't1', team_name: 'Team One', opponent_team_id: 't2', opponent_team_name: 'Team Two', side: null, venue: 'Neutral', format: 'Singles', outcome: 'W', clash_index_before: 960, ci_delta: 6}),
      fact({matchup_deduplication_key: 'k2', player_id: 'p2', player_name: 'Two', team_id: 't2', team_name: 'Team Two', opponent_team_id: 't1', opponent_team_name: 'Team One', side: null, venue: 'Neutral', format: 'Singles', outcome: 'L', clash_index_before: 955, ci_delta: -6}),
    ];
    const rows = buildHistoricalRatedResults(facts, [meta('k1', 7, 'March Championship'), meta('k2', 7, 'March Championship')]);
    expect(rows.map((row) => row.venue)).toEqual(['Neutral', 'Neutral']);
    expect(new Set(rows.map((row) => row.side))).toEqual(new Set(['Home', 'Away']));
  });

  it('rejects a partial doubles contest side', () => {
    const facts = [
      fact({matchup_deduplication_key: 'k1', player_id: 'p1', player_name: 'One', team_id: 't1', team_name: 'Team One', opponent_team_id: 't2', opponent_team_name: 'Team Two', side: 'Home', venue: 'Home', format: 'Doubles', outcome: 'W', clash_index_before: 1000, ci_delta: 5}),
      fact({matchup_deduplication_key: 'k2', player_id: 'p2', player_name: 'Two', team_id: 't2', team_name: 'Team Two', opponent_team_id: 't1', opponent_team_name: 'Team One', side: 'Away', venue: 'Home', format: 'Doubles', outcome: 'L', clash_index_before: 950, ci_delta: -2}),
      fact({matchup_deduplication_key: 'k3', player_id: 'p3', player_name: 'Three', team_id: 't2', team_name: 'Team Two', opponent_team_id: 't1', opponent_team_name: 'Team One', side: 'Away', venue: 'Home', format: 'Doubles', outcome: 'L', clash_index_before: 940, ci_delta: -3}),
    ];
    const rows = buildHistoricalRatedResults(facts, [meta('k1'), meta('k2'), meta('k3')]);
    expect(rows.map((row) => row.teamId)).toEqual(['t2']);
  });
});
