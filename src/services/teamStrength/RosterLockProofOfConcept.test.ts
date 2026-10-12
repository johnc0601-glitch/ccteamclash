import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import {calculateLockedRosterPrediction} from './LockedRosterPrediction';
import {comparePredictionPerformance} from './PredictionPerformance';

const rows = JSON.parse(fs.readFileSync(new URL('./fixtures/roster-lock-poc.json', import.meta.url), 'utf8'));
test('replays all three corrected locked rosters with frozen CI', () => {
  for (const [prefix, home, away, venue, score, opponent, penalty, expected] of [
    ['wild-turkey-vs-team-focus-', 'cougar-country', 'wild-turkey', 'Home', 22.5, 13.5, 0, 21.3690],
    ['ninjas-vs-kb-', 'dark-knights', 'kb', 'Neutral', 23, 13, 0, 19.0376],
    ['hayneous-og-s-vs-dark-knights-', 'ninjas', 'hayneous-og-s', 'Home', 30, 7.5, 1.5, 25.3456],
  ] as const) {
    const roster = rows.filter((row: {match_id: string}) => row.match_id.startsWith(prefix));
    const prediction = calculateLockedRosterPrediction({homeTeamId: home, awayTeamId: away,
      rosterPlayers: roster, frozenRatings: roster, venue});
    assert.ok(prediction);
    assert.ok(Number.isFinite(prediction.homeExpectedScore));
    assert.ok(Math.abs(prediction.homeExpectedScore - expected) < .0001);
    assert.equal(prediction.homeExpectedScore + prediction.awayExpectedScore, 36);
    const performance = comparePredictionPerformance({expectedScore: prediction.homeExpectedScore,
      chanceOfVictory: prediction.homeChanceOfVictory, actualScore: score, opponentActualScore: opponent,
      extraPenaltyPoints: penalty});
    assert.ok(performance?.aboveExpectations);
    assert.equal(performance.upset, false);
    assert.equal(performance.performanceScore, score - penalty);
  }
});
