import type {RatedResult} from '../RatedResult';
import {StoryHistoryIndex} from '../StoryHistoryIndex';
import type {StoryCandidateDraft} from '../StoryCandidate';

export const MIN_PERSONAL_BEST_CI_IMPROVEMENT = 5;

function magnitude(newCi: number, improvement: number): number {
  const levelBonus = Math.max(0, Math.min(25, (newCi - 900) / 4));
  return Math.max(0, Math.min(100, 45 + improvement * 2 + levelBonus));
}

/** Detects a player's latest reliable CI snapshot establishing a meaningful career high. */
export function detectPersonalBests(results: RatedResult[]): StoryCandidateDraft[] {
  const history = new StoryHistoryIndex(results);
  const players = new Map<string, {name: string; latestTeamName: string}>();

  for (const result of results) {
    result.subjectPlayerIds.forEach((playerId, index) => {
      players.set(playerId, {
        name: result.subjectNames[index] ?? result.subjectNames.join(' & '),
        latestTeamName: result.teamName,
      });
    });
  }

  const candidates: StoryCandidateDraft[] = [];
  for (const [playerId, identity] of players) {
    const observations = history.playerCiObservations(playerId);
    if (observations.length < 2) continue;
    const latest = observations.at(-1)!;
    const previous = observations.slice(0, -1);
    const previousBest = Math.max(
      latest.before,
      ...previous.flatMap((observation) => [observation.before, observation.after]),
    );
    const improvement = latest.after - previousBest;
    if (improvement < MIN_PERSONAL_BEST_CI_IMPROVEMENT) continue;

    const latestResult = history.playerResults(playerId).find((result) => result.id === latest.resultId);
    if (!latestResult) continue;

    candidates.push({
      id: `personal-best:ci:${playerId}:${latest.resultId}`,
      triggerType: 'PERSONAL_BEST',
      seasonId: latest.seasonId,
      eventId: latest.eventId,
      matchId: latestResult.matchId,
      playerIds: [playerId],
      teamIds: [latestResult.teamId],
      headlineFacts: {
        resultId: latest.resultId,
        player: identity.name,
        bestType: 'CAREER_HIGH_CI',
        newCi: latest.after,
        previousBestCi: previousBest,
        improvement,
        team: latestResult.teamName ?? identity.latestTeamName,
      },
      contextFacts: {
        establishedAt: latest.playedAt,
        ratedContestsInHistory: observations.length,
      },
      scores: {
        magnitude: magnitude(latest.after, improvement),
        rarity: 0,
        historicalSignificance: 55,
        recency: 100,
        standingsSignificance: 0,
        opponentQuality: 0,
      },
    });
  }

  return candidates.sort((a, b) => Number(b.headlineFacts.improvement) - Number(a.headlineFacts.improvement) || a.id.localeCompare(b.id));
}
