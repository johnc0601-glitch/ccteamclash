import type {LaunchPlayer, LaunchProfile, LaunchTeam, PlayerClaim} from '@/domain/launch/LaunchData';
import type {PlayerApplication} from './PlayerApplication';

export type PlayerApplicationReviewCard = {
  application: PlayerApplication;
  applicantName: string;
  profileStatus: LaunchProfile['status'] | 'Missing';
  requestedTeamName: string;
  claim: PlayerClaim | null;
  claimedPlayerName: string | null;
};

export function buildPlayerApplicationReviewCards(input: {
  applications: PlayerApplication[];
  profiles: LaunchProfile[];
  claims: PlayerClaim[];
  players: LaunchPlayer[];
  teams: LaunchTeam[];
}): PlayerApplicationReviewCard[] {
  return input.applications.map((application) => {
    const profile = input.profiles.find((candidate) => candidate.id === application.profileId);
    const claim = application.playedBefore
      ? latestClaim(input.claims.filter((candidate) => candidate.profileId === application.profileId))
      : null;
    const claimedPlayer = claim?.requestedPlayerId
      ? input.players.find((candidate) => candidate.id === claim.requestedPlayerId)
      : undefined;

    return {
      application,
      applicantName: profile?.displayName || 'Applicant unavailable',
      profileStatus: profile?.status ?? 'Missing',
      requestedTeamName: input.teams.find((team) => team.id === application.requestedTeamId)?.name
        ?? 'Requested team unavailable',
      claim,
      claimedPlayerName: claimedPlayer?.name ?? null,
    };
  });
}

function latestClaim(claims: PlayerClaim[]): PlayerClaim | null {
  return [...claims].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0] ?? null;
}
