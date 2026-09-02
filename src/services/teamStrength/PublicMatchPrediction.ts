import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import type {TeamAttendanceMember} from '@/domain/match-roster/MatchAttendance';
import {
  getMatchRosterLockAt,
  getPlayerAttendanceLockAt,
} from '@/domain/match-roster/MatchRosterLock';
import type {OfficialMatchRoster} from '@/domain/match-roster/MatchRosterSnapshot';
import type {MatchStatus} from '@/domain/schedule/Match';
import {
  calculateRosterBasedMatchPrediction,
  type PredictionReadiness,
} from './MatchPrediction';
import type {MatchVenueClassification} from './PredictionLifecycle';
import type {TeamStrengthPredictionSnapshot} from './PredictionSnapshot';
import {calculateMatchStageStrengthPair} from './PredictionStageStrength';
import {
  TEAM_STRENGTH_STAGE_LABELS,
  type TeamStrengthSource,
} from './RosterStrength';
import type {TeamStrengthConfidence, TeamVenue} from './TeamStrength';

export type PublicMatchPrediction =
  | {
      state: 'waiting';
      source: TeamStrengthSource;
      stageLabel: string;
      displayLabel: 'Prediction updating';
      detail: string;
      updateNote: string;
    }
  | {
      state: 'calculated';
      source: TeamStrengthSource;
      stageLabel: string;
      strengthLabel: string;
      displayLabel: 'Prediction unavailable' | 'Early estimate' | 'Chance of Victory';
      readiness: PredictionReadiness;
      confidence: TeamStrengthConfidence;
      awayStrength: number;
      homeStrength: number;
      awayChanceOfVictory: number | null;
      homeChanceOfVictory: number | null;
      venueNote: string;
      updateNote: string;
    };

export type PublicMatchPredictionInput = {
  matchDate: string | null;
  matchStatus: MatchStatus;
  hasPublishedResult: boolean;
  homeTeamId: string;
  awayTeamId: string;
  matchVenue: MatchVenueClassification;
  homePlayers: readonly LaunchPlayer[];
  awayPlayers: readonly LaunchPlayer[];
  homeAttendance?: readonly TeamAttendanceMember[];
  awayAttendance?: readonly TeamAttendanceMember[];
  officialRosters?: readonly OfficialMatchRoster[];
  now?: Date;
};

export function resolvePublicPredictionSource(
  matchDate: string,
  now = new Date(),
): TeamStrengthSource | undefined {
  const attendanceFinal = getPlayerAttendanceLockAt(matchDate);
  const rosterLock = getMatchRosterLockAt(matchDate);
  if (!attendanceFinal || !rosterLock) return undefined;

  const timestamp = now.getTime();
  if (timestamp >= rosterLock.getTime()) return 'matchLineup';
  if (timestamp >= attendanceFinal.getTime()) return 'confirmedAvailableRoster';
  return 'activeRoster';
}

/**
 * Converts the immutable Home-side snapshot into the public card model. This
 * keeps the displayed probability tied to the exact CI state preserved for
 * later calibration instead of recalculating it from newer player ratings.
 */
export function buildPublicMatchPredictionFromSnapshot(
  snapshot: TeamStrengthPredictionSnapshot,
): PublicMatchPrediction | undefined {
  if (snapshot.side !== 'Home') return undefined;

  const displayChance = snapshot.predictionReadiness === 'Unavailable'
    ? null
    : snapshot.chanceOfVictory;

  return {
    state: 'calculated',
    source: snapshot.source,
    stageLabel: snapshot.strengthLabel,
    strengthLabel: snapshot.strengthLabel,
    displayLabel: displayLabelForReadiness(snapshot.predictionReadiness),
    readiness: snapshot.predictionReadiness,
    confidence: snapshot.confidence,
    awayStrength: snapshot.opponentBaseStrength,
    homeStrength: snapshot.teamBaseStrength,
    awayChanceOfVictory: displayChance === null ? null : 1 - displayChance,
    homeChanceOfVictory: displayChance,
    venueNote: venueNoteFromTeamVenue(snapshot.venue),
    updateNote: updateNote(snapshot.source),
  };
}

export function buildPublicMatchPrediction(
  input: PublicMatchPredictionInput,
): PublicMatchPrediction | undefined {
  if (
    !input.matchDate
    || input.hasPublishedResult
    || input.matchStatus === 'Completed'
    || input.matchStatus === 'Cancelled'
  ) return undefined;

  const source = resolvePublicPredictionSource(input.matchDate, input.now);
  if (!source) return undefined;

  const strengths = calculateMatchStageStrengthPair({
    source,
    homeTeamId: input.homeTeamId,
    awayTeamId: input.awayTeamId,
    homePlayers: input.homePlayers,
    awayPlayers: input.awayPlayers,
    homeAttendance: input.homeAttendance,
    awayAttendance: input.awayAttendance,
    officialRosters: input.officialRosters,
  });

  if (!strengths) {
    return {
      state: 'waiting',
      source,
      stageLabel: TEAM_STRENGTH_STAGE_LABELS[source],
      displayLabel: 'Prediction updating',
      detail: waitingDetail(source),
      updateNote: updateNote(source),
    };
  }

  const homePrediction = calculateRosterBasedMatchPrediction({
    team: strengths.home,
    opponent: strengths.away,
    venue: venueForSide(input.matchVenue, 'Home'),
  });
  const awayPrediction = calculateRosterBasedMatchPrediction({
    team: strengths.away,
    opponent: strengths.home,
    venue: venueForSide(input.matchVenue, 'Away'),
  });
  if (!homePrediction || !awayPrediction) return undefined;

  return {
    state: 'calculated',
    source,
    stageLabel: strengths.home.label,
    strengthLabel: strengths.home.label,
    displayLabel: homePrediction.displayLabel,
    readiness: homePrediction.readiness,
    confidence: homePrediction.confidence,
    awayStrength: strengths.away.baseStrength,
    homeStrength: strengths.home.baseStrength,
    awayChanceOfVictory: awayPrediction.displayChanceOfVictory,
    homeChanceOfVictory: homePrediction.displayChanceOfVictory,
    venueNote: venueNote(input.matchVenue),
    updateNote: updateNote(source),
  };
}

function displayLabelForReadiness(
  readiness: PredictionReadiness,
): 'Prediction unavailable' | 'Early estimate' | 'Chance of Victory' {
  if (readiness === 'Unavailable') return 'Prediction unavailable';
  if (readiness === 'EarlyEstimate') return 'Early estimate';
  return 'Chance of Victory';
}

function venueForSide(
  matchVenue: MatchVenueClassification,
  side: 'Home' | 'Away',
): TeamVenue {
  if (matchVenue === 'Neutral') return 'Neutral';
  return side === 'Home' ? 'Home' : 'Away';
}

function venueNote(matchVenue: MatchVenueClassification): string {
  return matchVenue === 'Home'
    ? 'Home-course advantage included (+8 CI)'
    : 'Neutral venue — no home adjustment';
}

function venueNoteFromTeamVenue(venue: TeamVenue): string {
  return venue === 'Home'
    ? 'Home-course advantage included (+8 CI)'
    : 'Neutral venue — no home adjustment';
}

function waitingDetail(source: TeamStrengthSource): string {
  if (source === 'matchLineup') {
    return 'Waiting for both official lineups to be available.';
  }
  if (source === 'confirmedAvailableRoster') {
    return 'Waiting for confirmed player availability from both teams.';
  }
  return 'Waiting for complete active roster data from both teams.';
}

function updateNote(source: TeamStrengthSource): string {
  if (source === 'matchLineup') return 'Official lineup stage';
  if (source === 'confirmedAvailableRoster') {
    return 'Updates again when the official lineup locks';
  }
  return 'Updates after player availability locks Friday at noon';
}
