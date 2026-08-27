import {
  calculateRosterBasedMatchPrediction,
  type PredictionReadiness,
} from './MatchPrediction';
import {
  buildTeamStrengthPredictionSnapshot,
  type TeamStrengthPredictionSnapshot,
} from './PredictionSnapshot';
import type {PredictionSnapshotRepository} from './PredictionSnapshotRepository';
import type {RosterStrengthResult, TeamStrengthSource} from './RosterStrength';
import type {TeamVenue} from './TeamStrength';

/** Which scheduled side owns the course. */
export type MatchVenueClassification = 'HomeTeam' | 'AwayTeam' | 'Neutral';

export type PredictionCaptureResult =
  | {
      captured: true;
      source: TeamStrengthSource;
      homeReadiness: PredictionReadiness;
      awayReadiness: PredictionReadiness;
      snapshots: readonly [TeamStrengthPredictionSnapshot, TeamStrengthPredictionSnapshot];
    }
  | {
      captured: false;
      reason: 'StageMismatch' | 'InvalidIdentity' | 'InvalidSnapshot';
    };

/**
 * Builds and persists the two sides of one immutable roster-stage prediction.
 * Both sides share one capture timestamp. Course advantage follows the team
 * whose registered home course is being used, even if that team is stored as
 * the scheduled away side. Neutral/other courses receive no venue adjustment.
 */
export async function captureRosterPredictionStage(input: {
  repository: PredictionSnapshotRepository;
  matchId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeStrength: RosterStrengthResult;
  awayStrength: RosterStrengthResult;
  matchVenue: MatchVenueClassification;
  capturedAt?: string;
}): Promise<PredictionCaptureResult> {
  if (input.homeStrength.source !== input.awayStrength.source) {
    return {captured: false, reason: 'StageMismatch'};
  }
  if (
    !input.matchId.trim()
    || !input.homeTeamId.trim()
    || !input.awayTeamId.trim()
    || input.homeTeamId === input.awayTeamId
  ) {
    return {captured: false, reason: 'InvalidIdentity'};
  }

  const capturedAt = input.capturedAt ?? new Date().toISOString();
  const homePrediction = calculateRosterBasedMatchPrediction({
    team: input.homeStrength,
    opponent: input.awayStrength,
    venue: venueForSide(input.matchVenue, 'Home'),
  });
  const awayPrediction = calculateRosterBasedMatchPrediction({
    team: input.awayStrength,
    opponent: input.homeStrength,
    venue: venueForSide(input.matchVenue, 'Away'),
  });

  if (!homePrediction || !awayPrediction) {
    return {captured: false, reason: 'InvalidSnapshot'};
  }

  const homeSnapshot = buildTeamStrengthPredictionSnapshot({
    matchId: input.matchId,
    teamId: input.homeTeamId,
    opponentTeamId: input.awayTeamId,
    side: 'Home',
    prediction: homePrediction,
    teamStrength: input.homeStrength,
    opponentStrength: input.awayStrength,
    capturedAt,
  });
  const awaySnapshot = buildTeamStrengthPredictionSnapshot({
    matchId: input.matchId,
    teamId: input.awayTeamId,
    opponentTeamId: input.homeTeamId,
    side: 'Away',
    prediction: awayPrediction,
    teamStrength: input.awayStrength,
    opponentStrength: input.homeStrength,
    capturedAt,
  });

  if (!homeSnapshot || !awaySnapshot) {
    return {captured: false, reason: 'InvalidSnapshot'};
  }

  const snapshots = [homeSnapshot, awaySnapshot] as const;
  await input.repository.saveIfAbsent(snapshots);

  return {
    captured: true,
    source: input.homeStrength.source,
    homeReadiness: homePrediction.readiness,
    awayReadiness: awayPrediction.readiness,
    snapshots,
  };
}

export function venueForScheduledSide(
  matchVenue: MatchVenueClassification,
  side: 'Home' | 'Away',
): TeamVenue {
  if (matchVenue === 'Neutral') return 'Neutral';
  if (matchVenue === 'HomeTeam') return side === 'Home' ? 'Home' : 'Away';
  return side === 'Away' ? 'Home' : 'Away';
}

function venueForSide(
  matchVenue: MatchVenueClassification,
  side: 'Home' | 'Away',
): TeamVenue {
  return venueForScheduledSide(matchVenue, side);
}
