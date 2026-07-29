import type {LaunchProfile, PlayerClaim} from '@/domain/launch/LaunchData';

export type LaunchMemberPreview = {
  profiles: LaunchProfile[];
  claims: PlayerClaim[];
};

const PREVIEW_TIMESTAMP = '2026-07-25T00:00:00.000Z';

export function getLaunchMemberPreview(): LaunchMemberPreview {
  return {
    profiles: [
      {
        id: 'preview-commissioner',
        userId: 'preview-user-commissioner',
        displayName: 'Commissioner',
        role: 'Commissioner',
        status: 'Approved',
        playerId: null,
        captainTeamId: null,
        createdAt: PREVIEW_TIMESTAMP,
        updatedAt: PREVIEW_TIMESTAMP,
      },
      {
        id: 'preview-captain',
        userId: 'preview-user-captain',
        displayName: 'Captain profile',
        role: 'Captain',
        status: 'Approved',
        playerId: 'ryan-frusti',
        captainTeamId: 'beast-mode',
        createdAt: PREVIEW_TIMESTAMP,
        updatedAt: PREVIEW_TIMESTAMP,
      },
      {
        id: 'preview-pending',
        userId: 'preview-user-pending',
        displayName: 'Pending player',
        role: 'Player',
        status: 'Pending',
        playerId: null,
        captainTeamId: null,
        createdAt: PREVIEW_TIMESTAMP,
        updatedAt: PREVIEW_TIMESTAMP,
      },
    ],
    claims: [
      {
        id: 'preview-claim',
        profileId: 'preview-pending',
        requestedPlayerId: null,
        submittedName: 'Pending player',
        submittedPdgaNumber: '',
        status: 'Pending',
        createdAt: PREVIEW_TIMESTAMP,
        reviewedAt: null,
        reviewedBy: null,
      },
    ],
  };
}
