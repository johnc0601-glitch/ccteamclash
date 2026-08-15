import type {PlayerClaim} from '@/domain/launch/LaunchData';
import type {PlayerApplication} from '@/domain/player-application/PlayerApplication';

export type PlayerApplicationSummary = {
  status: PlayerApplication['status'];
  displayName: string;
  identityLabel: string;
  requestedTeamName: string;
  canChangeRequestedTeam: boolean;
  previousPlayerName?: string;
  historyConnectionStatus?: PlayerClaim['status'];
};

export function buildPlayerApplicationSummary(input: {
  application: PlayerApplication;
  displayName: string;
  requestedTeamName?: string;
  claim?: PlayerClaim;
  previousPlayerName?: string;
}): PlayerApplicationSummary {
  return {
    status: input.application.status,
    displayName: input.displayName,
    identityLabel: `${input.application.playerType} • ${input.application.gender}`,
    requestedTeamName: input.requestedTeamName ?? 'Requested team unavailable',
    canChangeRequestedTeam: input.application.status === 'Pending',
    previousPlayerName: input.application.playedBefore ? input.previousPlayerName : undefined,
    historyConnectionStatus: input.application.playedBefore ? input.claim?.status : undefined,
  };
}

export function canStartPlayerApplication(input: {
  profileState: string;
  seasonAvailable: boolean;
  enrolledTeamCount: number;
}): {available: boolean; message?: string} {
  if (input.profileState !== 'pending_player') {
    return {available: false, message: 'Only a Pending Player profile can submit an application.'};
  }
  if (!input.seasonAvailable) {
    return {available: false, message: 'Player applications are not open for a current season.'};
  }
  if (input.enrolledTeamCount === 0) {
    return {available: false, message: 'No teams are available for player applications yet.'};
  }
  return {available: true};
}
