import type {ChallengeResult} from '@/services/statistics/StatisticsTypes';

export type PlayerCiMovement = {
  playerId: string;
  seasonId: string;
  ciGain: number;
  ratedContests: number;
};

export class ClashIndexMovement {
  calculateForSeason(playerId: string, seasonId: string, results: ChallengeResult[]): PlayerCiMovement | undefined {
    const deltas = results
      .filter((result) => result.seasonId === seasonId)
      .flatMap((result) => result.playerResults)
      .filter((entry) => entry.playerId === playerId && entry.ciDelta !== undefined)
      .map((entry) => entry.ciDelta as number);

    if (!deltas.length) return undefined;
    return {
      playerId,
      seasonId,
      ciGain: deltas.reduce((total, delta) => total + delta, 0),
      ratedContests: deltas.length,
    };
  }

  calculateCareer(playerId: string, results: ChallengeResult[]): PlayerCiMovement | undefined {
    const deltas = results
      .flatMap((result) => result.playerResults)
      .filter((entry) => entry.playerId === playerId && entry.ciDelta !== undefined)
      .map((entry) => entry.ciDelta as number);

    if (!deltas.length) return undefined;
    return {
      playerId,
      seasonId: 'career',
      ciGain: deltas.reduce((total, delta) => total + delta, 0),
      ratedContests: deltas.length,
    };
  }
}
