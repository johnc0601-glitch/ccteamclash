import type {RatedResult} from '../RatedResult';
import type {StoryCandidateDraft} from '../StoryCandidate';

export const MIN_WIN_STREAK = 3;

type PlayerResult = {
  playerId: string;
  playerName: string;
  result: RatedResult;
};

function streakMagnitude(length: number): number {
  return Math.max(0, Math.min(100, 20 + (length - 2) * 15));
}

function playerRows(results: RatedResult[]): PlayerResult[] {
  return results.flatMap((result) => result.subjectPlayerIds.map((playerId, index) => ({
    playerId,
    playerName: result.subjectNames[index] ?? result.subjectNames.join(' & '),
    result,
  })));
}

/**
 * Detect current season win streaks by player and format. Singles and doubles
 * are kept separate so same-day contest ordering cannot manufacture or break an
 * "overall" streak when a player participates in both formats.
 */
export function detectWinStreaks(results: RatedResult[]): StoryCandidateDraft[] {
  const groups = new Map<string, PlayerResult[]>();
  for (const row of playerRows(results)) {
    const key = `${row.result.seasonId}\u0000${row.playerId}\u0000${row.result.format}`;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }

  const candidates: StoryCandidateDraft[] = [];
  for (const rows of groups.values()) {
    rows.sort((a, b) => a.result.playedAt.localeCompare(b.result.playedAt) || a.result.id.localeCompare(b.result.id));
    const latest = rows.at(-1);
    if (!latest?.result.won) continue;

    let streakLength = 0;
    for (let index = rows.length - 1; index >= 0 && rows[index].result.won; index -= 1) {
      streakLength += 1;
    }
    if (streakLength < MIN_WIN_STREAK) continue;

    const streakStart = rows[rows.length - streakLength];
    candidates.push({
      id: `win-streak:${latest.result.seasonId}:${latest.playerId}:${latest.result.format}`,
      triggerType: 'WIN_STREAK',
      seasonId: latest.result.seasonId,
      eventId: latest.result.eventId,
      matchId: latest.result.matchId,
      playerIds: [latest.playerId],
      teamIds: [latest.result.teamId],
      headlineFacts: {
        player: latest.playerName,
        format: latest.result.format,
        streakLength,
        team: latest.result.teamName,
      },
      contextFacts: {
        streakStartedAt: streakStart.result.playedAt,
        latestWinAt: latest.result.playedAt,
      },
      scores: {
        magnitude: streakMagnitude(streakLength),
        rarity: 0,
        historicalSignificance: 0,
        recency: 100,
        standingsSignificance: 0,
        opponentQuality: 0,
      },
    });
  }

  return candidates.sort((a, b) => Number(b.headlineFacts.streakLength) - Number(a.headlineFacts.streakLength) || a.id.localeCompare(b.id));
}
