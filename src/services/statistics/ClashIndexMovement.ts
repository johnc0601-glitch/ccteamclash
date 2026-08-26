import type {ChallengeResult, PlayerResultFormat} from '@/services/statistics/StatisticsTypes';

export type PlayerCiMovement = {
  playerId: string;
  seasonId: string;
  ciGain: number;
  singlesCiGain: number;
  doublesCiGain: number;
  ratedContests: number;
};

export class ClashIndexMovement {
  calculateForSeason(playerId: string, seasonId: string, results: ChallengeResult[]): PlayerCiMovement | undefined {
    const entries = results
      .filter((result) => result.seasonId === seasonId)
      .flatMap((result) => result.playerResults)
      .filter((entry) => entry.playerId === playerId && entry.ciDelta !== undefined);

    return summarizeMovement(playerId, seasonId, entries);
  }

  calculateCareer(playerId: string, results: ChallengeResult[]): PlayerCiMovement | undefined {
    const entries = results
      .flatMap((result) => result.playerResults)
      .filter((entry) => entry.playerId === playerId && entry.ciDelta !== undefined);

    return summarizeMovement(playerId, 'career', entries);
  }
}

function summarizeMovement(
  playerId: string,
  seasonId: string,
  entries: Array<{format: PlayerResultFormat; ciDelta?: number}>,
): PlayerCiMovement | undefined {
  if (!entries.length) return undefined;
  let singlesCiGain = 0;
  let doublesCiGain = 0;
  for (const entry of entries) {
    const delta = entry.ciDelta as number;
    if (entry.format === 'Singles') singlesCiGain += delta;
    else doublesCiGain += delta;
  }
  return {
    playerId,
    seasonId,
    ciGain: singlesCiGain + doublesCiGain,
    singlesCiGain,
    doublesCiGain,
    ratedContests: entries.length,
  };
}
