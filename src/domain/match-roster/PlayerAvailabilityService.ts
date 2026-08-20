import {
  MATCH_ATTENDANCE_STATUSES,
  type AttendanceActor,
  type AttendanceMatch,
  type AttendanceResult,
  type MatchAttendanceStatus,
  type PersonalAttendance,
} from '@/domain/match-roster/MatchAttendance';
import {isPlayerAttendanceOpen} from '@/domain/match-roster/MatchRosterLock';
import type {MatchRosterRepository} from '@/domain/match-roster/MatchRosterRepository';

export class PlayerAvailabilityService {
  constructor(
    private readonly repository: Pick<
      MatchRosterRepository,
      'getAttendanceActor' | 'getAttendanceMatch' | 'getAttendance' | 'saveAttendance'
    >,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async getPersonalAttendance(userId: string, matchId: string): Promise<PersonalAttendance | undefined> {
    const context = await this.getAuthorizedContext(userId, matchId);
    if (!context) return undefined;

    const attendance = await this.repository.getAttendance(matchId, context.actor.playerId);
    return {
      matchId,
      playerId: context.actor.playerId,
      playerName: context.actor.playerName,
      teamId: context.actor.teamId,
      status: attendance?.status ?? 'Unconfirmed',
      attendanceOpen: isPlayerAttendanceOpen(context.match, this.now()),
    };
  }

  async setOwnAttendance(
    userId: string,
    matchId: string,
    status: string,
  ): Promise<AttendanceResult<PersonalAttendance>> {
    if (!isAttendanceStatus(status)) {
      return {ok: false, message: 'Choose Yes or No.'};
    }

    const context = await this.getAuthorizedContext(userId, matchId);
    if (!context) {
      return {ok: false, message: 'Your approved player profile is not eligible for this match.'};
    }
    if (!isPlayerAttendanceOpen(context.match, this.now())) {
      return {ok: false, message: 'Player responses closed Friday at noon.'};
    }

    const attendance = await this.repository.saveAttendance({
      matchId,
      teamId: context.actor.teamId,
      playerId: context.actor.playerId,
      status,
      updatedBy: context.actor.profileId,
    });

    return {
      ok: true,
      data: {
        matchId,
        playerId: context.actor.playerId,
        playerName: context.actor.playerName,
        teamId: context.actor.teamId,
        status: attendance.status,
        attendanceOpen: true,
      },
    };
  }

  private async getAuthorizedContext(
    userId: string,
    matchId: string,
  ): Promise<{actor: AuthorizedPlayer; match: AttendanceMatch} | undefined> {
    const [actor, match] = await Promise.all([
      this.repository.getAttendanceActor(userId),
      this.repository.getAttendanceMatch(matchId),
    ]);
    if (!actor || !match || !isAuthorizedPlayer(actor)) return undefined;
    if (actor.teamId !== match.homeTeamId && actor.teamId !== match.awayTeamId) return undefined;
    return {actor, match};
  }
}

type AuthorizedPlayer = AttendanceActor & {
  playerId: string;
  teamId: string;
  playerName: string;
};

function isAuthorizedPlayer(actor: AttendanceActor): actor is AuthorizedPlayer {
  return Boolean(
    actor.profileStatus === 'Approved'
    && actor.playerId
    && actor.teamId
    && actor.playerName
    && actor.playerActive
  );
}

function isAttendanceStatus(status: string): status is MatchAttendanceStatus {
  return (MATCH_ATTENDANCE_STATUSES as readonly string[]).includes(status);
}
