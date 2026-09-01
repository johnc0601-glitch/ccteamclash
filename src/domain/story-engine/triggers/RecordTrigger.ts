import type {RatedResult} from '../RatedResult';
import {StoryHistoryIndex, type PlayerCiObservation} from '../StoryHistoryIndex';
import type {StoryCandidateDraft} from '../StoryCandidate';

export const MIN_PLAYERS_FOR_LEAGUE_CI_RECORD = 5;

type ObservationWithPlayer = PlayerCiObservation & {
  playerId: string;
  playerName: string;
};

/**
 * Detects a new all-time league CI high from reliable player snapshots only.
 * A minimum comparison field prevents tiny/partial data sets from making broad
 * "league record" claims.
 */
export function detectRecords(results: RatedResult[]): StoryCandidateDraft[] {
  const history = new StoryHistoryIndex(results);
  const identities = new Map<string, string>();
  for (const result of results) {
    result.subjectPlayerIds.forEach((playerId, index) => {
      identities.set(playerId, result.subjectNames[index] ?? result.subjectNames.join(' & '));
    });
  }
  if (identities.size < MIN_PLAYERS_FOR_LEAGUE_CI_RECORD) return [];

  const all: ObservationWithPlayer[] = [];
  for (const [playerId, playerName] of identities) {
    for (const observation of history.playerCiObservations(playerId)) {
      all.push({...observation, playerId, playerName});
    }
  }
  all.sort((a, b) => a.playedAt.localeCompare(b.playedAt) || a.resultId.localeCompare(b.resultId) || a.playerId.localeCompare(b.playerId));

  const latestByPlayer = new Map<string, ObservationWithPlayer>();
  for (const observation of all) latestByPlayer.set(observation.playerId, observation);

  const candidates: StoryCandidateDraft[] = [];
  for (const latest of latestByPlayer.values()) {
    const prior = all.filter((observation) =>
      observation.playedAt < latest.playedAt
      || (observation.playedAt === latest.playedAt && observation.resultId < latest.resultId)
      || (observation.playedAt === latest.playedAt && observation.resultId === latest.resultId && observation.playerId < latest.playerId),
    );
    if (prior.length === 0) continue;

    const previousRecordCi = Math.max(
      latest.before,
      ...prior.flatMap((observation) => [observation.before, observation.after]),
    );
    if (latest.after <= previousRecordCi) continue;

    const latestResult = history.playerResults(latest.playerId).find((result) => result.id === latest.resultId);
    if (!latestResult) continue;

    candidates.push({
      id: `record:all-time-ci:${latest.playerId}:${latest.resultId}`,
      triggerType: 'RECORD',
      seasonId: latest.seasonId,
      eventId: latest.eventId,
      matchId: latestResult.matchId,
      playerIds: [latest.playerId],
      teamIds: [latestResult.teamId],
      headlineFacts: {
        resultId: latest.resultId,
        player: latest.playerName,
        recordType: 'ALL_TIME_CI_HIGH',
        newRecordCi: latest.after,
        previousRecordCi,
        recordImprovement: latest.after - previousRecordCi,
        team: latestResult.teamName,
      },
      contextFacts: {
        establishedAt: latest.playedAt,
        comparisonPlayers: identities.size,
      },
      scores: {
        magnitude: Math.max(80, Math.min(100, 80 + (latest.after - previousRecordCi) * 2)),
        rarity: 100,
        historicalSignificance: 100,
        recency: 100,
        standingsSignificance: 0,
        opponentQuality: 0,
      },
    });
  }

  return candidates.sort((a, b) => Number(b.headlineFacts.newRecordCi) - Number(a.headlineFacts.newRecordCi) || a.id.localeCompare(b.id));
}
