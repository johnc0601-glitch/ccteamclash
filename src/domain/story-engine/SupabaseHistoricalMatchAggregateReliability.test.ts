import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildHistoricalRatedResultReport,
  type HistoricalEventMetadataRow,
  type HistoricalTeamMatchMetadataRow,
  type StoredHistoricalRatingFact,
} from './SupabaseHistoricalRatedResultRepository';

function fact(overrides: Partial<StoredHistoricalRatingFact> & Pick<StoredHistoricalRatingFact, 'matchup_deduplication_key' | 'contest_id' | 'player_id' | 'player_name' | 'team_id' | 'team_name' | 'opponent_team_id' | 'opponent_team_name' | 'side' | 'format' | 'outcome'>): StoredHistoricalRatingFact {
  return {
    historical_match_key: 'team-match:10',
    season_id: 'season-1',
    venue: 'Home',
    clash_index_before: 900,
    opponent_effective_ci: 900,
    win_probability: 0.5,
    actual_points: overrides.outcome === 'W' ? 1 : overrides.outcome === 'T' ? 0.5 : 0,
    expected_points: 0.5,
    ci_delta: overrides.outcome === 'W' ? 8 : -8,
    algorithm_version: 'test-v1',
    ...overrides,
  };
}

function metadata(keys: string[]): HistoricalEventMetadataRow[] {
  return keys.map((key) => ({
    deduplication_key: key,
    season_id: 'season-1',
    season_name: '2025-2026',
    event_label: 'December',
    event_order: 3,
    historical_team_match_id: 10,
  }));
}

const official: HistoricalTeamMatchMetadataRow = {
  id: 10,
  away_team_name: 'Team Away',
  home_team_name: 'Team Home',
  ci_venue: 'Home',
};

test('one quarantined contest marks surviving rows unsafe for team-match aggregation', () => {
  const facts: StoredHistoricalRatingFact[] = [
    fact({matchup_deduplication_key: 's-home', contest_id: 'safe-singles', player_id: 'home-1', player_name: 'Home One', team_id: 'home', team_name: 'Team Home', opponent_team_id: 'away', opponent_team_name: 'Team Away', side: 'Home', format: 'Singles', outcome: 'W'}),
    fact({matchup_deduplication_key: 's-away', contest_id: 'safe-singles', player_id: 'away-1', player_name: 'Away One', team_id: 'away', team_name: 'Team Away', opponent_team_id: 'home', opponent_team_name: 'Team Home', side: 'Away', format: 'Singles', outcome: 'L'}),
    fact({matchup_deduplication_key: 'd-home-1', contest_id: 'bad-doubles', player_id: 'home-2', player_name: 'Home Two', team_id: 'home', team_name: 'Team Home', opponent_team_id: 'away', opponent_team_name: 'Team Away', side: 'Home', format: 'Doubles', outcome: 'W'}),
    fact({matchup_deduplication_key: 'd-home-2', contest_id: 'bad-doubles', player_id: 'home-3', player_name: 'Home Three', team_id: 'third', team_name: 'Wrong Team', opponent_team_id: 'away', opponent_team_name: 'Team Away', side: 'Home', format: 'Doubles', outcome: 'W'}),
    fact({matchup_deduplication_key: 'd-away-1', contest_id: 'bad-doubles', player_id: 'away-2', player_name: 'Away Two', team_id: 'away', team_name: 'Team Away', opponent_team_id: 'home', opponent_team_name: 'Team Home', side: 'Away', format: 'Doubles', outcome: 'L'}),
    fact({matchup_deduplication_key: 'd-away-2', contest_id: 'bad-doubles', player_id: 'away-3', player_name: 'Away Three', team_id: 'away', team_name: 'Team Away', opponent_team_id: 'home', opponent_team_name: 'Team Home', side: 'Away', format: 'Doubles', outcome: 'L'}),
  ];

  const report = buildHistoricalRatedResultReport(
    facts,
    metadata(facts.map((row) => row.matchup_deduplication_key)),
    [official],
  );

  assert.equal(report.emittedContests, 1);
  assert.equal(report.quarantinedContests, 1);
  assert.equal(report.results.length, 2);
  assert.ok(report.results.every((row) => row.matchAggregateReliable === false));
});
