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

/**
 * Public display stages intentionally differ from immutable capture windows.
 * The active-roster forecast can be shown as soon as a match is scheduled.
 * Confirmed Available replaces it at Friday noon ET, and Match Lineup replaces
 * that at the official match-day roster lock.
 */
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
 * Builds the current regular-season forecast for public matchday presentation.
 * It never mixes information stages and never recomputes a public pre-match
 * forecast after a result has been published.
 */
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
    displayLabel: homePrediction.displayLabel,
    readiness: homePrediction.readiness,
    confidence: homePrediction.confidence,
    awayStrength: strengths.away.baseStrength,
    homeStrength: strengths.home.baseStrength,
    awayChanceOfVictory: awayPrediction.displayChanceOfVictory,
    homeChanceOfVictory: homePrediction.displayChanceOfVictory,
    venueNote: input.matchVenue === 'Home'
      ? 'Home-course advantage included (+8 CI)'
      : 'Neutral venue — no home adjustment',
    updateNote: updateNote(source),
  };
}

function venueForSide(
  matchVenue: MatchVenueClassification,
  side: 'Home' | 'Away',
): TeamVenue {
  if (matchVenue === 'Neutral') return 'Neutral';
  return side === 'Home' ? 'Home' : 'Away';
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
