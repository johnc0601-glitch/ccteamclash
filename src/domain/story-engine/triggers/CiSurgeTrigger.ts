import type {RatedResult} from '../RatedResult';
import {StoryHistoryIndex, type PlayerCiWindow} from '../StoryHistoryIndex';
import type {StoryCandidateDraft} from '../StoryCandidate';

export const CI_SURGE_3_MATCHDAY_MIN_GAIN = 20;
export const CI_SURGE_5_MATCHDAY_MIN_GAIN = 30;

type PlayerSeason = {
  playerId: string;
  seasonId: string;
  playerName: string;
};

type QualifiedWindow = {
  window: PlayerCiWindow;
  threshold: number;
};

function magnitude(gain: number, threshold: number): number {
  return Math.max(0, Math.min(100, 45 + (gain - threshold) * 2));
}

function qualifiedWindow(index: StoryHistoryIndex, playerId: string, seasonId: string): QualifiedWindow | null {
  const three = index.playerCiWindow(playerId, 3, {seasonId});
  const five = index.playerCiWindow(playerId, 5, {seasonId});
  const qualified = [
    three && three.totalDelta >= CI_SURGE_3_MATCHDAY_MIN_GAIN
      ? {window: three, threshold: CI_SURGE_3_MATCHDAY_MIN_GAIN}
      : null,
    five && five.totalDelta >= CI_SURGE_5_MATCHDAY_MIN_GAIN
      ? {window: five, threshold: CI_SURGE_5_MATCHDAY_MIN_GAIN}
      : null,
  ].filter((value): value is QualifiedWindow => value !== null);

  return qualified.sort((a, b) =>
    (b.window.totalDelta / b.threshold) - (a.window.totalDelta / a.threshold)
    || b.window.matchdays - a.window.matchdays,
  )[0] ?? null;
}

/** Detects substantial positive CI movement over a player's last 3 or 5 rated Matchdays. */
export function detectCiSurges(results: RatedResult[]): StoryCandidateDraft[] {
  const history = new StoryHistoryIndex(results);
  const playerSeasons = new Map<string, PlayerSeason>();

  for (const result of results) {
    result.subjectPlayerIds.forEach((playerId, playerIndex) => {
      const key = `${result.seasonId}\u0000${playerId}`;
      playerSeasons.set(key, {
        playerId,
        seasonId: result.seasonId,
        playerName: result.subjectNames[playerIndex] ?? result.subjectNames.join(' & '),
      });
    });
  }

  const candidates: StoryCandidateDraft[] = [];
  for (const subject of playerSeasons.values()) {
    const selected = qualifiedWindow(history, subject.playerId, subject.seasonId);
    if (!selected) continue;

    const latestObservation = selected.window.observations.at(-1)!;
    const latestResult = history.playerResults(subject.playerId, {seasonId: subject.seasonId})
      .find((result) => result.id === latestObservation.resultId);
    if (!latestResult) continue;

    candidates.push({
      id: `ci-surge:${subject.seasonId}:${subject.playerId}:${latestObservation.matchId}`,
      triggerType: 'CI_SURGE',
      seasonId: subject.seasonId,
      eventId: latestObservation.eventId,
      matchId: latestObservation.matchId,
      playerIds: [subject.playerId],
      teamIds: [latestResult.teamId],
      headlineFacts: {
        resultId: latestObservation.resultId,
        player: subject.playerName,
        matchdays: selected.window.matchdays,
        ciGain: selected.window.totalDelta,
        startCi: selected.window.startCi,
        currentCi: selected.window.currentCi,
        team: latestResult.teamName,
      },
      contextFacts: {
        windowStartedAt: selected.window.observations[0].playedAt,
        windowEndedAt: latestObservation.playedAt,
      },
      scores: {
        magnitude: magnitude(selected.window.totalDelta, selected.threshold),
        rarity: 0,
        historicalSignificance: 0,
        recency: 100,
        standingsSignificance: 0,
        opponentQuality: 0,
      },
    });
  }

  return candidates.sort((a, b) => Number(b.headlineFacts.ciGain) - Number(a.headlineFacts.ciGain) || a.id.localeCompare(b.id));
}
