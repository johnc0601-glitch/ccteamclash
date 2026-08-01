import {
  MATCH_ATTENDANCE_STATUSES,
  type AttendanceActor,
  type AttendanceMatch,
  type AttendanceResult,
  type MatchAttendanceStatus,
  type PersonalAttendance,
} from '@/domain/match-roster/MatchAttendance';
import {isMatchAttendanceOpen} from '@/domain/match-roster/MatchRosterLock';
import type {MatchRosterRepository} from '@/domain/match-roster/MatchRosterRepository';

export class MatchRosterService {
  constructor(
    private readonly repository: MatchRosterRepository,
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
      attendanceOpen: isMatchAttendanceOpen(context.match, this.now()),
    };
  }

  async setOwnAttendance(
    userId: string,
    matchId: string,
    status: string,
  ): Promise<AttendanceResult<PersonalAttendance>> {
    if (!isAttendanceStatus(status)) {
      return {ok: false, message: 'Choose Playing or Not Playing.'};
    }

    const context = await this.getAuthorizedContext(userId, matchId);
    if (!context) {
      return {ok: false, message: 'Your approved player profile is not eligible for this match.'};
    }
    if (!isMatchAttendanceOpen(context.match, this.now())) {
      return {ok: false, message: 'Attendance is closed for this match.'};
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
  ): Promise<{actor: AuthorizedActor; match: AttendanceMatch} | undefined> {
    const [actor, match] = await Promise.all([
      this.repository.getAttendanceActor(userId),
      this.repository.getAttendanceMatch(matchId),
    ]);
    if (!actor || !match || !isAuthorizedPlayer(actor)) return undefined;
    if (actor.teamId !== match.homeTeamId && actor.teamId !== match.awayTeamId) return undefined;
    return {actor, match};
  }
}

type AuthorizedActor = AttendanceActor & {
  playerId: string;
  teamId: string;
  playerName: string;
};

function isAuthorizedPlayer(actor: AttendanceActor): actor is AuthorizedActor {
  return actor.profileStatus === 'Approved'
    && actor.profileRole === 'Player'
    && actor.playerActive
    && Boolean(actor.playerId && actor.teamId && actor.playerName);
}

function isAttendanceStatus(status: string): status is MatchAttendanceStatus {
  return MATCH_ATTENDANCE_STATUSES.some((candidate) => candidate === status);
}
