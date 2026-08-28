import assert from 'node:assert/strict';
import test from 'node:test';

import type {ResultContest, ResultContestOutcome} from '@/domain/results/MatchResult';

import type {TeamStrengthPredictionSnapshot} from './PredictionSnapshot';
import {analyzeRetrospectiveMatch} from './RetrospectiveMatchAnalysis';

test('uses official score residual as structural scoring without changing frozen CI', () => {
  const snapshot = matchLineupSnapshot({
    homeCis: Array.from({length: 18}, (_, index) => [`home-${index}`, 900] as const),
    awayCis: Array.from({length: 18}, (_, index) => [`away-${index}`, 900] as const),
  });
  const contests = fullTiedMatch();

  const analysis = analyzeRetrospectiveMatch({
    snapshot,
    contests,
    officialHomeScore: 19,
    officialAwayScore: 18,
  });

  assert.ok(analysis);
  assert.equal(analysis.ratedSinglesContestCount, 18);
  assert.equal(analysis.ratedDoublesContestCount, 9);
  assert.equal(analysis.ratedContestMaximumPoints, 36);
  assert.equal(analysis.homeRatedActualPoints, 18);
  assert.equal(analysis.awayRatedActualPoints, 18);
  assert.equal(analysis.homeRatedExpectedPoints, 18);
  assert.equal(analysis.awayRatedExpectedPoints, 18);
  assert.equal(analysis.homeStructuralAdjustment, 1);
  assert.equal(analysis.awayStructuralAdjustment, 0);
  assert.equal(analysis.homeExpectedPoints, 19);
  assert.equal(analysis.awayExpectedPoints, 18);
  assert.equal(analysis.expectedPointMargin, 1);
  assert.ok(analysis.homeChanceOfVictory > 0.5);
  assert.equal(analysis.actualWinner, 'Home');
  assert.equal(analysis.predictedWinner, 'Home');
  assert.equal(analysis.winnerCorrect, true);
});

test('reuses the frozen pre-match venue so the +8 home adjustment is applied once', () => {
  const snapshot = matchLineupSnapshot({
    venue: 'Home',
    homeCis: Array.from({length: 18}, (_, index) => [`home-${index}`, 900] as const),
    awayCis: Array.from({length: 18}, (_, index) => [`away-${index}`, 900] as const),
  });

  const analysis = analyzeRetrospectiveMatch({
    snapshot,
    contests: fullTiedMatch(),
    officialHomeScore: 18,
    officialAwayScore: 18,
  });

  assert.ok(analysis);
  assert.equal(analysis.homeStructuralAdjustment, 0);
  assert.equal(analysis.awayStructuralAdjustment, 0);
  assert.ok(analysis.homeRatedExpectedPoints > 18);
  assert.ok(analysis.awayRatedExpectedPoints < 18);
  assert.ok(analysis.homeChanceOfVictory > 0.5);
});

test('uses the 80/20 doubles strength rule on the actual recorded pair', () => {
  const snapshot = matchLineupSnapshot({
    homeCis: [['home-strong', 1000], ['home-weak', 900]],
    awayCis: [['away-one', 950], ['away-two', 950]],
  });
  const contest = resultContest({
    id: 'd-1',
    format: 'Doubles',
    position: 1,
    homeOutcome: 'T',
    awayOutcome: 'T',
    homePlayerIds: ['home-strong', 'home-weak'],
    awayPlayerIds: ['away-one', 'away-two'],
  });

  const analysis = analyzeRetrospectiveMatch({
    snapshot,
    contests: [contest],
    officialHomeScore: 1,
    officialAwayScore: 1,
  });

  assert.ok(analysis);
  // Home pair = 0.8*1000 + 0.2*900 = 980 versus Away 950.
  assert.equal(analysis.ratedDoublesContestCount, 1);
  assert.ok(analysis.homeRatedExpectedPoints > 1);
  assert.ok(analysis.awayRatedExpectedPoints < 1);
});

test('refuses to substitute a later CI when a required frozen CI is unresolved', () => {
  const snapshot = matchLineupSnapshot({
    homeCis: [['home', null]],
    awayCis: [['away', 900]],
  });
  const contest = resultContest({
    id: 's-1',
    format: 'Singles',
    position: 1,
    homeOutcome: 'W',
    awayOutcome: 'L',
    homePlayerIds: ['home'],
    awayPlayerIds: ['away'],
  });

  assert.equal(
    analyzeRetrospectiveMatch({
      snapshot,
      contests: [contest],
      officialHomeScore: 1,
      officialAwayScore: 0,
    }),
    undefined,
  );
});

test('treats incomplete result slots as structural instead of CI-rated contests', () => {
  const snapshot = matchLineupSnapshot({
    homeCis: [['home', 900]],
    awayCis: [['away', 900]],
  });
  const complete = resultContest({
    id: 's-1',
    format: 'Singles',
    position: 1,
    homeOutcome: 'T',
    awayOutcome: 'T',
    homePlayerIds: ['home'],
    awayPlayerIds: ['away'],
  });
  const automatic = resultContest({
    id: 's-2',
    format: 'Singles',
    position: 2,
    homeOutcome: 'W',
    awayOutcome: 'L',
    homePlayerIds: ['home'],
    awayPlayerIds: [],
  });

  const analysis = analyzeRetrospectiveMatch({
    snapshot,
    contests: [complete, automatic],
    officialHomeScore: 1.5,
    officialAwayScore: 0.5,
  });

  assert.ok(analysis);
  assert.equal(analysis.ratedSinglesContestCount, 1);
  assert.equal(analysis.homeRatedActualPoints, 0.5);
  assert.equal(analysis.awayRatedActualPoints, 0.5);
  assert.equal(analysis.homeStructuralAdjustment, 1);
  assert.equal(analysis.awayStructuralAdjustment, 0);
});

test('requires the Home-side Match Lineup snapshot and matching result contests', () => {
  const snapshot = matchLineupSnapshot({
    homeCis: [['home', 900]],
    awayCis: [['away', 900]],
  });
  const wrongMatchContest = resultContest({
    id: 's-1',
    matchId: 'other-match',
    format: 'Singles',
    position: 1,
    homeOutcome: 'T',
    awayOutcome: 'T',
    homePlayerIds: ['home'],
    awayPlayerIds: ['away'],
  });

  assert.equal(
    analyzeRetrospectiveMatch({
      snapshot,
      contests: [wrongMatchContest],
      officialHomeScore: 0.5,
      officialAwayScore: 0.5,
    }),
    undefined,
  );

  assert.equal(
    analyzeRetrospectiveMatch({
      snapshot: {...snapshot, source: 'activeRoster', captureReason: 'PreMatch'},
      contests: [],
      officialHomeScore: 0,
      officialAwayScore: 0,
    }),
    undefined,
  );
});

function fullTiedMatch(): ResultContest[] {
  const singles = Array.from({length: 18}, (_, index) => resultContest({
    id: `s-${index}`,
    format: 'Singles',
    position: index + 1,
    homeOutcome: 'T',
    awayOutcome: 'T',
    homePlayerIds: [`home-${index}`],
    awayPlayerIds: [`away-${index}`],
  }));
  const doubles = Array.from({length: 9}, (_, index) => resultContest({
    id: `d-${index}`,
    format: 'Doubles',
    position: index + 1,
    homeOutcome: 'T',
    awayOutcome: 'T',
    homePlayerIds: [`home-${index * 2}`, `home-${index * 2 + 1}`],
    awayPlayerIds: [`away-${index * 2}`, `away-${index * 2 + 1}`],
  }));
  return [...singles, ...doubles];
}

function resultContest(input: {
  id: string;
  matchId?: string;
  format: 'Singles' | 'Doubles';
  position: number;
  homeOutcome: ResultContestOutcome;
  awayOutcome: ResultContestOutcome;
  homePlayerIds: string[];
  awayPlayerIds: string[];
}): ResultContest {
  return {
    id: input.id,
    matchId: input.matchId ?? 'match',
    format: input.format,
    position: input.position,
    homeOutcome: input.homeOutcome,
    awayOutcome: input.awayOutcome,
    homeScore: null,
    awayScore: null,
    players: [
      ...input.homePlayerIds.map((playerId, index) => ({
        playerId,
        playerName: playerId,
        teamId: 'home-team',
        teamName: 'Home',
        side: 'Home' as const,
        slot: (index + 1) as 1 | 2,
      })),
      ...input.awayPlayerIds.map((playerId, index) => ({
        playerId,
        playerName: playerId,
        teamId: 'away-team',
        teamName: 'Away',
        side: 'Away' as const,
        slot: (index + 1) as 1 | 2,
      })),
    ],
    createdAt: '2026-10-03T20:00:00.000Z',
    updatedAt: '2026-10-03T20:00:00.000Z',
  };
}

function matchLineupSnapshot(input: {
  venue?: TeamStrengthPredictionSnapshot['venue'];
  homeCis: readonly (readonly [string, number | null])[];
  awayCis: readonly (readonly [string, number | null])[];
}): TeamStrengthPredictionSnapshot {
  const homeIds = input.homeCis.map(([playerId]) => playerId);
  const awayIds = input.awayCis.map(([playerId]) => playerId);
  return {
    matchId: 'match',
    teamId: 'home-team',
    opponentTeamId: 'away-team',
    side: 'Home',
    source: 'matchLineup',
    captureReason: 'RosterLock',
    strengthLabel: 'Match Lineup Strength',
    modelVersion: 'team-strength-v1',
    capturedAt: '2026-10-03T19:00:00.000Z',
    venue: input.venue ?? 'Neutral',
    confidence: 'Full',
    predictionReadiness: 'Ready',
    calibrationSlope: 0.117,
    teamBaseStrength: 900,
    opponentBaseStrength: 900,
    matchupStrengthDifference: 0,
    expectedPointShare: 0.5,
    chanceOfVictory: 0.5,
    teamPlayerIds: homeIds,
    opponentPlayerIds: awayIds,
    teamPlayerClashIndexes: input.homeCis.map(([playerId, clashIndex]) => ({playerId, clashIndex})),
    opponentPlayerClashIndexes: input.awayCis.map(([playerId, clashIndex]) => ({playerId, clashIndex})),
    teamPlayerCount: homeIds.length,
    opponentPlayerCount: awayIds.length,
    teamFemalePlayerCount: 0,
    opponentFemalePlayerCount: 0,
    teamMalePlayerCount: homeIds.length,
    opponentMalePlayerCount: awayIds.length,
    teamUnknownGenderPlayerCount: 0,
    opponentUnknownGenderPlayerCount: 0,
    teamStandardPlayerShortfall: Math.max(0, 18 - homeIds.length),
    opponentStandardPlayerShortfall: Math.max(0, 18 - awayIds.length),
    teamProvisionalPlayerCount: 0,
    opponentProvisionalPlayerCount: 0,
    teamFallbackPlayerCount: 0,
    opponentFallbackPlayerCount: 0,
    teamOmittedPlayerCount: 0,
    opponentOmittedPlayerCount: 0,
  };
}
