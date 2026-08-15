import {
  MATCH_ATTENDANCE_STATUSES,
  type AttendanceActor,
  type AttendanceMatch,
  type AttendanceResult,
  type MatchAttendanceStatus,
  type ManagedTeamRoster,
  type PersonalAttendance,
} from '@/domain/match-roster/MatchAttendance';
import {isMatchAttendanceOpen, isMatchRosterLocked} from '@/domain/match-roster/MatchRosterLock';
import type {MatchRosterRepository} from '@/domain/match-roster/MatchRosterRepository';
import type {
  OfficialMatchRoster,
  OfficialSnapshotState,
  SnapshotCronSummary,
} from '@/domain/match-roster/MatchRosterSnapshot';
import type {OfficialRosterExport, OfficialRosterExportTeam} from '@/domain/match-roster/MatchRosterExport';
import {
  isMatchAtOrAfterSnapshotCutoff,
  snapshotErrorClass,
  type SnapshotLogContext,
} from '@/domain/match-roster/MatchRosterSnapshotAutomation';

export class MatchRosterService {
  constructor(
    private readonly repository: MatchRosterRepository,
    private readonly now: () => Date = () => new Date(),
    private readonly snapshotCreator: Pick<
      MatchRosterRepository,
      'createLockedSnapshot' | 'hasCompleteSnapshot' | 'getOfficialMatchRosters'
    > = repository,
    private readonly log: (context: SnapshotLogContext) => void = (context) => {
      if (context.operation === 'configuration') {
        console.warn('Match roster snapshot automation configuration is unavailable.', context);
      } else {
        console.error('Match roster snapshot operation failed.', context);
      }
    },
  ) {}

  getOfficialMatchRosters(matchId: string): Promise<OfficialMatchRoster[]> {
    return this.repository.getOfficialMatchRosters(matchId);
  }

  async getOfficialRosterExport(
    userId: string | undefined,
    matchId: string,
  ): Promise<AttendanceResult<OfficialRosterExport>> {
    if (!userId) return {ok: false, message: 'Official roster export is not available.'};
    try {
      const match = await this.repository.getAttendanceMatch(matchId);
      if (!match) return {ok: false, message: 'Official roster export is not available.'};
      const [actor, complete] = await Promise.all([
        this.repository.getAttendanceActor(userId, match.seasonId),
        this.repository.hasCompleteSnapshot(matchId),
      ]);
      if (
        !actor
        || actor.profileStatus !== 'Approved'
        || !match.date
        || !isMatchRosterLocked(match, this.now())
        || !complete
      ) return {ok: false, message: 'Official roster export is not available.'};
      const participatingTeamIds = [match.homeTeamId, match.awayTeamId]
        .filter((teamId): teamId is string => Boolean(teamId));
      const authorized = actor.profileRole === 'Commissioner'
        || (
          actor.profileRole === 'Captain'
          && Boolean(actor.captainTeamId && participatingTeamIds.includes(actor.captainTeamId))
        );
      if (!authorized || participatingTeamIds.length !== 2) {
        return {ok: false, message: 'Official roster export is not available.'};
      }

      const rosters = await this.repository.getOfficialMatchRosters(matchId);
      const home = rosters.find((roster) => roster.teamId === match.homeTeamId);
      const away = rosters.find((roster) => roster.teamId === match.awayTeamId);
      if (!home || !away) return {ok: false, message: 'Official roster export is not available.'};

      return {
        ok: true,
        data: {
          matchId,
          matchDate: match.date,
          homeTeam: toExportTeam(home),
          awayTeam: toExportTeam(away),
          generatedAt: this.now().toISOString(),
        },
      };
    } catch {
      return {ok: false, message: 'Official roster export is not available.'};
    }
  }

  async canManageOfficialSnapshot(userId: string, matchId: string): Promise<boolean> {
    const match = await this.repository.getAttendanceMatch(matchId);
    if (!match) return false;
    const [actor, complete] = await Promise.all([
      this.repository.getAttendanceActor(userId, match.seasonId),
      this.repository.hasCompleteSnapshot(matchId),
    ]);
    return Boolean(
      actor?.profileStatus === 'Approved'
      && actor.profileRole === 'Commissioner'
      && match.status !== 'Cancelled'
      && isMatchRosterLocked(match, this.now())
      && complete
    );
  }

  async ensureLockedSnapshot(matchId: string, snapshotStartAt?: Date): Promise<OfficialSnapshotState> {
    const match = await this.repository.getAttendanceMatch(matchId);
    if (!match || !isMatchRosterLocked(match, this.now())) return {status: 'before-lock', rosters: []};

    try {
      if (await this.repository.hasCompleteSnapshot(matchId)) {
        return {status: 'complete', rosters: await this.repository.getOfficialMatchRosters(matchId)};
      }
      if (!snapshotStartAt || !isMatchAtOrAfterSnapshotCutoff(match, snapshotStartAt)) {
        this.log({operation: 'configuration', matchId});
        return {status: 'unavailable', rosters: []};
      }
      await this.snapshotCreator.createLockedSnapshot(matchId);
      if (!await this.snapshotCreator.hasCompleteSnapshot(matchId)) return {status: 'unavailable', rosters: []};
      return {status: 'complete', rosters: await this.snapshotCreator.getOfficialMatchRosters(matchId)};
    } catch (error) {
      this.log({operation: 'lazy-create', matchId, errorClass: snapshotErrorClass(error)});
      return {status: 'unavailable', rosters: []};
    }
  }

  async commissionerAddSnapshotPlayer(
    userId: string,
    matchId: string,
    teamId: string,
    playerId: string,
  ): Promise<AttendanceResult<OfficialMatchRoster>> {
    const context = await this.getCommissionerSnapshotContext(userId, matchId, teamId);
    if (!context) return {ok: false, message: 'Official roster correction is not available.'};
    try {
      await this.repository.addSnapshotPlayer(matchId, teamId, playerId);
    } catch {
      return {ok: false, message: 'That player could not be added to the official roster.'};
    }
    const roster = (await this.repository.getOfficialMatchRosters(matchId)).find((item) => item.teamId === teamId);
    return roster ? {ok: true, data: roster} : {ok: false, message: 'Official roster is unavailable.'};
  }

  async commissionerRemoveSnapshotPlayer(
    userId: string,
    matchId: string,
    teamId: string,
    playerId: string,
  ): Promise<AttendanceResult<OfficialMatchRoster>> {
    const context = await this.getCommissionerSnapshotContext(userId, matchId, teamId);
    if (!context) return {ok: false, message: 'Official roster correction is not available.'};
    const roster = context.rosters.find((item) => item.teamId === teamId);
    if (!roster?.players.some((player) => player.playerId === playerId)) {
      return {ok: false, message: 'That player is not on the official roster.'};
    }
    try {
      await this.repository.removeSnapshotPlayer(matchId, teamId, playerId);
    } catch {
      return {ok: false, message: 'That player could not be removed from the official roster.'};
    }
    const updated = (await this.repository.getOfficialMatchRosters(matchId)).find((item) => item.teamId === teamId);
    return updated ? {ok: true, data: updated} : {ok: false, message: 'Official roster is unavailable.'};
  }

  async processLockedSnapshots(snapshotStartAt?: Date): Promise<SnapshotCronSummary> {
    if (!snapshotStartAt) {
      this.log({operation: 'configuration'});
      return {processed: 0, succeeded: 0, alreadyComplete: 0, failed: 0};
    }
    const now = this.now();
    const candidates = await this.repository.getSnapshotCandidateMatches(snapshotStartAt, now);
    const summary: SnapshotCronSummary = {processed: candidates.length, succeeded: 0, alreadyComplete: 0, failed: 0};

    for (const candidate of candidates) {
      try {
        if (await this.repository.hasCompleteSnapshot(candidate.id)) {
          summary.alreadyComplete += 1;
          continue;
        }
        await this.snapshotCreator.createLockedSnapshot(candidate.id);
        if (await this.repository.hasCompleteSnapshot(candidate.id)) summary.succeeded += 1;
        else summary.failed += 1;
      } catch (error) {
        summary.failed += 1;
        this.log({operation: 'scheduled-create', matchId: candidate.id, errorClass: snapshotErrorClass(error)});
      }
    }
    return summary;
  }

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
        this.repository.getTeamAttendance(matchId, context.match.seasonId, teamId),
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
      players: await this.repository.getTeamAttendance(matchId, context.match.seasonId, teamId),
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
      this.repository.getTeamAttendance(matchId, context.match.seasonId, teamMembers.teamId),
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
      this.repository.getTeamAttendance(matchId, context.match.seasonId, teamId),
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
    const match = await this.repository.getAttendanceMatch(matchId);
    if (!match) return undefined;
    const actor = await this.repository.getAttendanceActor(userId, match.seasonId);
    if (!actor || !isAuthorizedPlayer(actor)) return undefined;
    if (actor.teamId !== match.homeTeamId && actor.teamId !== match.awayTeamId) return undefined;
    return {actor, match};
  }

  private async getManagerContext(
    userId: string,
    matchId: string,
  ): Promise<{actor: AttendanceActor; match: AttendanceMatch; teamIds: string[]} | undefined> {
    const match = await this.repository.getAttendanceMatch(matchId);
    if (!match) return undefined;
    const actor = await this.repository.getAttendanceActor(userId, match.seasonId);
    if (!actor || actor.profileStatus !== 'Approved') return undefined;

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

  private async getCommissionerSnapshotContext(
    userId: string,
    matchId: string,
    teamId: string,
  ): Promise<{actor: AttendanceActor; match: AttendanceMatch; rosters: OfficialMatchRoster[]} | undefined> {
    const match = await this.repository.getAttendanceMatch(matchId);
    if (!match) return undefined;
    const [actor, rosters] = await Promise.all([
      this.repository.getAttendanceActor(userId, match.seasonId),
      this.repository.getOfficialMatchRosters(matchId),
    ]);
    if (
      !actor
      || actor.profileStatus !== 'Approved'
      || actor.profileRole !== 'Commissioner'
      || match.status === 'Cancelled'
      || !isMatchRosterLocked(match, this.now())
    ) return undefined;
    const teamIds = [match.awayTeamId, match.homeTeamId].filter((id): id is string => Boolean(id));
    const snapshotTeamIds = new Set(rosters.map((roster) => roster.teamId));
    if (
      teamIds.length !== 2
      || !teamIds.includes(teamId)
      || !teamIds.every((participatingTeamId) => snapshotTeamIds.has(participatingTeamId))
    ) return undefined;
    return {actor, match, rosters};
  }
}

function toExportTeam(roster: OfficialMatchRoster): OfficialRosterExportTeam {
  return {
    name: roster.teamNameSnapshot,
    playerNames: roster.players
      .map((player) => player.playerNameSnapshot)
      .sort((left, right) => left.localeCompare(right, 'en', {sensitivity: 'base'})),
  };
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
