import type {RatedResult} from '../RatedResult';
import type {StoryCandidateDraft} from '../StoryCandidate';

export const UPSET_WIN_PROBABILITY_THRESHOLD = 0.40;

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/**
 * Converts model surprise into a 0-100 editorial magnitude score.
 * A 40% win chance barely qualifies; a 10% chance or lower is maximum magnitude.
 */
export function upsetMagnitude(winProbability: number): number {
  return clampScore(((UPSET_WIN_PROBABILITY_THRESHOLD - winProbability) / 0.30) * 100);
}

/**
 * Detect upset wins from authoritative rated results. Historical rarity and
 * record context are intentionally left at zero for the context engine to add.
 */
export function detectUpsets(results: RatedResult[]): StoryCandidateDraft[] {
  return results
    .filter((result) => result.won && result.winProbability < UPSET_WIN_PROBABILITY_THRESHOLD)
    .map((result) => ({
      id: `upset:${result.id}`,
      triggerType: 'UPSET',
      seasonId: result.seasonId,
      eventId: result.eventId,
      matchId: result.matchId,
      playerIds: [...result.subjectPlayerIds],
      teamIds: [result.teamId, result.opponentTeamId],
      headlineFacts: {
        resultId: result.id,
        format: result.format,
        winner: result.subjectNames.join(' & '),
        team: result.teamName,
        opponentTeam: result.opponentTeamName,
        winProbability: result.winProbability,
        ciDeficit: result.ciDeficit,
        ciDelta: result.ciDelta,
      },
      contextFacts: {
        modelVersion: result.modelVersion,
        playedAt: result.playedAt,
      },
      scores: {
        magnitude: upsetMagnitude(result.winProbability),
        rarity: 0,
        historicalSignificance: 0,
        recency: 100,
        standingsSignificance: 0,
        opponentQuality: 0,
      },
    }));
}
