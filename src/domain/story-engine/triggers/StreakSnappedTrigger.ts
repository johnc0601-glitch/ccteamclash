import type {RatedResult} from '../RatedResult';
import type {StoryCandidateDraft} from '../StoryCandidate';
import {MIN_WIN_STREAK} from './WinStreakTrigger';

type PlayerResult = {
  playerId: string;
  playerName: string;
  result: RatedResult;
};

function playerRows(results: RatedResult[]): PlayerResult[] {
  return results.flatMap((result) => result.subjectPlayerIds.map((playerId, index) => ({
    playerId,
    playerName: result.subjectNames[index] ?? result.subjectNames.join(' & '),
    result,
  })));
}

function snappedMagnitude(length: number): number {
  return Math.max(0, Math.min(100, 25 + (length - MIN_WIN_STREAK) * 15));
}

/**
 * Detects a qualifying player win streak ending in the latest result for that
 * player/format/season. This is an internal editorial fact; publication policy
 * decides whether it is framed around the winner, a comeback, or suppressed.
 */
export function detectStreaksSnapped(results: RatedResult[]): StoryCandidateDraft[] {
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
    if (!latest || latest.result.won || rows.length < MIN_WIN_STREAK + 1) continue;

    let snappedStreak = 0;
    for (let index = rows.length - 2; index >= 0 && rows[index].result.won; index -= 1) {
      snappedStreak += 1;
    }
    if (snappedStreak < MIN_WIN_STREAK) continue;

    candidates.push({
      id: `streak-snapped:${latest.result.seasonId}:${latest.playerId}:${latest.result.format}:${latest.result.id}`,
      triggerType: 'STREAK_SNAPPED',
      seasonId: latest.result.seasonId,
      eventId: latest.result.eventId,
      matchId: latest.result.matchId,
      playerIds: [latest.playerId],
      teamIds: [latest.result.teamId, latest.result.opponentTeamId],
      headlineFacts: {
        resultId: latest.result.id,
        player: latest.playerName,
        format: latest.result.format,
        snappedStreak,
        breakerOutcome: latest.result.outcome,
        team: latest.result.teamName,
        opponentTeam: latest.result.opponentTeamName,
      },
      contextFacts: {
        streakEndedAt: latest.result.playedAt,
      },
      scores: {
        magnitude: snappedMagnitude(snappedStreak),
        rarity: 0,
        historicalSignificance: 0,
        recency: 100,
        standingsSignificance: 0,
        opponentQuality: 0,
      },
    });
  }

  return candidates.sort((a, b) => Number(b.headlineFacts.snappedStreak) - Number(a.headlineFacts.snappedStreak) || a.id.localeCompare(b.id));
}
