import type {PublicMatchPrediction} from './PublicMatchPrediction';

/**
 * Safe public projection. It carries only a rounded point spread and a short
 * explanation: never return win probabilities, CI strengths or roster details.
 */
export type PublicMatchSpreadSummary = {
  favoriteTeam: string | null;
  points: number;
  closeness: string;
  isEarlyEstimate: boolean;
};

export function toPublicMatchSpread(
  prediction: PublicMatchPrediction | undefined,
  homeTeamName: string,
  awayTeamName: string,
): PublicMatchSpreadSummary | undefined {
  if (prediction?.state !== 'calculated'
    || prediction.homeProjectedMargin == null
    || !Number.isFinite(prediction.homeProjectedMargin)) return undefined;

  const points = Math.round(Math.abs(prediction.homeProjectedMargin) * 2) / 2;
  const favoriteTeam = points < 0.5 ? null : prediction.homeProjectedMargin > 0
    ? homeTeamName : awayTeamName;

  return {
    favoriteTeam,
    points,
    closeness: points < 0.5 ? 'Even on projected points'
      : points <= 4 ? 'Within one doubles-result swing (4 pts)'
        : points <= 8 ? 'Within two doubles-result swings (8 pts)'
          : 'More than two doubles-result swings apart',
    isEarlyEstimate: prediction.readiness !== 'Ready',
  };
}
