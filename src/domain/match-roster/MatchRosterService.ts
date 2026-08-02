import {
  MATCH_ATTENDANCE_STATUSES,
  type AttendanceActor,
  type AttendanceMatch,
  type AttendanceResult,
  type MatchAttendanceStatus,
  type ManagedTeamRoster,
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

  async getManagedTeamRosters(userId: string, matchId: string): Promise<ManagedTeamRoster[]> {
    const context = await this.getManagerContext(userId, matchId);
    if (!context) return [];

    return Promise.all(context.teamIds.map(async (teamId) => {
      const [players, roster] = await Promise.all([
        this.repository.getTeamAttendance(matchId, teamId),
        this.repository.getMatchRoster(matchId, teamId),
      ]);
      return {
        matchId,
        teamId,
        attendanceOpen: isMatchAttendanceOpen(context.match, this.now()),
        rosterStatus: roster?.status ?? 'Draft',
        confirmedAt: roster?.confirmedAt ?? null,
        players,
      };
    }));
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

  async setTeamAttendance(
    userId: string,
    matchId: string,
    playerId: string,
    status: string,
  ): Promise<AttendanceResult<ManagedTeamRoster>> {
    if (!isAttendanceStatus(status)) {
      return {ok: false, message: 'Choose Playing or Not Playing.'};
    }

    const context = await this.getManagerContext(userId, matchId);
    if (!context || !isMatchAttendanceOpen(context.match, this.now())) {
      return {ok: false, message: 'Captain attendance management is not available for this match.'};
    }

    const teamMembers = (await Promise.all(context.teamIds.map(async (teamId) => ({
      teamId,
      players: await this.repository.getTeamAttendance(matchId, teamId),
    })))).find((team) => team.players.some((player) => player.playerId === playerId));
    if (!teamMembers) {
      return {ok: false, message: 'That player is not on a team you manage for this match.'};
    }

    await this.repository.saveAttendance({
      matchId,
      teamId: teamMembers.teamId,
      playerId,
      status,
      updatedBy: context.actor.profileId,
    });
    const [players, roster] = await Promise.all([
      this.repository.getTeamAttendance(matchId, teamMembers.teamId),
      this.repository.getMatchRoster(matchId, teamMembers.teamId),
    ]);

    return {
      ok: true,
      data: {
        matchId,
        teamId: teamMembers.teamId,
        attendanceOpen: true,
        rosterStatus: roster?.status ?? 'Draft',
        confirmedAt: roster?.confirmedAt ?? null,
        players,
      },
    };
  }

  async confirmTeamRoster(
    userId: string,
    matchId: string,
    teamId: string,
  ): Promise<AttendanceResult<ManagedTeamRoster>> {
    const context = await this.getManagerContext(userId, matchId);
    if (!context || !context.teamIds.includes(teamId)) {
      return {ok: false, message: 'You cannot confirm that team roster.'};
    }
    if (!isMatchAttendanceOpen(context.match, this.now())) {
      return {ok: false, message: 'Roster confirmation is closed for this match.'};
    }

    const confirmedAt = this.now().toISOString();
    const [roster, players] = await Promise.all([
      this.repository.saveMatchRoster({
        matchId,
        teamId,
        confirmedBy: context.actor.profileId,
        confirmedAt,
      }),
      this.repository.getTeamAttendance(matchId, teamId),
    ]);

    return {
      ok: true,
      data: {
        matchId,
        teamId,
        attendanceOpen: true,
        rosterStatus: roster.status,
        confirmedAt: roster.confirmedAt,
        players,
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

  private async getManagerContext(
    userId: string,
    matchId: string,
  ): Promise<{actor: AttendanceActor; match: AttendanceMatch; teamIds: string[]} | undefined> {
    const [actor, match] = await Promise.all([
      this.repository.getAttendanceActor(userId),
      this.repository.getAttendanceMatch(matchId),
    ]);
    if (!actor || !match || actor.profileStatus !== 'Approved') return undefined;

    const matchTeamIds = [match.awayTeamId, match.homeTeamId].filter((teamId): teamId is string => Boolean(teamId));
    if (actor.profileRole === 'Commissioner') return {actor, match, teamIds: matchTeamIds};
    if (
      actor.profileRole === 'Captain'
      && actor.captainTeamId
      && matchTeamIds.includes(actor.captainTeamId)
    ) {
      return {actor, match, teamIds: [actor.captainTeamId]};
    }
    return undefined;
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
