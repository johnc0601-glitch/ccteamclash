import fs from 'node:fs';
import {calculateLockedRosterPrediction} from '../src/services/teamStrength/LockedRosterPrediction';
import {comparePredictionPerformance} from '../src/services/teamStrength/PredictionPerformance';

// Read-only historical replay. Never insert these observations as pre-match forecasts.
const rows = JSON.parse(fs.readFileSync(new URL('../src/services/teamStrength/fixtures/roster-lock-poc.json', import.meta.url), 'utf8'));
const matches = [
  {id: 'wild-turkey-vs-team-focus-7fafa1dc-4ee3-4e7f-85dc-4b5f866275f2', home: 'cougar-country', away: 'wild-turkey', label: 'Cougar vs Wild Turkey', venue: 'Home' as const, homeScore: 22.5, awayScore: 13.5, extraPenalty: 0},
  {id: 'ninjas-vs-kb-cccdd6ca-c5ce-4ecb-b7c9-c02d7d657e9f', home: 'dark-knights', away: 'kb', label: 'DK vs KB', venue: 'Neutral' as const, homeScore: 23, awayScore: 13, extraPenalty: 0},
  {id: 'hayneous-og-s-vs-dark-knights-c1b325a9-473a-4bed-a85c-0dec6766a766', home: 'ninjas', away: 'hayneous-og-s', label: 'Ninjas vs OG', venue: 'Home' as const, homeScore: 30, awayScore: 7.5, extraPenalty: 1.5},
];
const results = matches.map(match => {
  const roster = rows.filter((row: {match_id: string}) => row.match_id === match.id);
  const prediction = calculateLockedRosterPrediction({homeTeamId: match.home, awayTeamId: match.away,
    rosterPlayers: roster, frozenRatings: roster, venue: match.venue});
  return {match: match.label, provenance: 'Historical reconstruction',
    missingFrozenRatings: roster.filter((row: {clash_index_before: number | null}) => row.clash_index_before == null)
      .map((row: {player_name_snapshot: string}) => row.player_name_snapshot),
    prediction: prediction ?? null,
    publishedScore: [match.homeScore, match.awayScore],
    performance: prediction ? comparePredictionPerformance({expectedScore: prediction.homeExpectedScore,
      chanceOfVictory: prediction.homeChanceOfVictory, actualScore: match.homeScore,
      opponentActualScore: match.awayScore, extraPenaltyPoints: match.extraPenalty}) : null};
});
console.log(JSON.stringify(results, null, 2));
