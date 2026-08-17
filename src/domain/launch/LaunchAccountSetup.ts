import type {SupabaseClient, User} from '@supabase/supabase-js';
import {LaunchService} from '@/domain/launch/LaunchService';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import type {Database} from '@/lib/supabase/database';

type LaunchSupabaseClient = SupabaseClient<Database>;
type SubmitApplicationRpcClient = {
  rpc: (
    fn: 'submit_launch_player_application',
    args: {
      target_season_id: string;
      target_requested_team_id: string;
      target_player_type: string;
      target_gender: string;
      target_played_before: boolean;
    },
  ) => Promise<{error: {message: string} | null}>;
};

type LaunchSignupMetadata = {
  displayName?: unknown;
  requestedPlayerId?: unknown;
  submittedName?: unknown;
  submittedPdgaNumber?: unknown;
  seasonId?: unknown;
  requestedTeamId?: unknown;
  playerType?: unknown;
  gender?: unknown;
  playedBefore?: unknown;
};

export type LaunchSignupInput = {
  displayName: string;
  requestedPlayerId?: string;
  submittedName?: string;
  submittedPdgaNumber?: string;
  seasonId?: string;
  requestedTeamId?: string;
  playerType?: 'Adult' | 'Junior';
  gender?: 'Male' | 'Female';
  playedBefore?: boolean;
};

export async function ensureLaunchSignupProfile(
  supabase: LaunchSupabaseClient,
  user: User,
  input?: LaunchSignupInput,
): Promise<string | null> {
  const metadata = input ?? readMetadata(user.user_metadata);
  if (!metadata?.displayName) return null;

  const repository = new SupabaseLaunchRepository(supabase);
  const service = new LaunchService(repository);
  const profileResult = await service.createPendingProfile({
    userId: user.id,
    displayName: metadata.displayName,
  });
  if (!profileResult.ok) return profileResult.message;

  if (
    metadata.seasonId
    && metadata.requestedTeamId
    && metadata.playerType
    && metadata.gender
    && typeof metadata.playedBefore === 'boolean'
  ) {
    const {error: applicationError} = await (supabase as unknown as SubmitApplicationRpcClient).rpc(
      'submit_launch_player_application',
      {
        target_season_id: metadata.seasonId,
        target_requested_team_id: metadata.requestedTeamId,
        target_player_type: metadata.playerType,
        target_gender: metadata.gender,
        target_played_before: metadata.playedBefore,
      },
    );
    if (applicationError) return applicationError.message;
  }

  if (!metadata.requestedPlayerId || !metadata.submittedName) return null;

  const existingClaims = await repository.getPlayerClaims();
  const alreadyClaimed = existingClaims.some((claim) => claim.profileId === profileResult.data.id);
  if (alreadyClaimed) return null;

  const claimResult = await service.submitPlayerClaim({
    profileId: profileResult.data.id,
    requestedPlayerId: metadata.requestedPlayerId,
    submittedName: metadata.submittedName,
    submittedPdgaNumber: metadata.submittedPdgaNumber ?? '',
  });

  return claimResult.ok ? null : claimResult.message;
}

function readMetadata(metadata: LaunchSignupMetadata): LaunchSignupInput | null {
  const displayName = readString(metadata.displayName);
  const requestedPlayerId = readString(metadata.requestedPlayerId);
  const submittedName = readString(metadata.submittedName);
  const playerType = readPlayerType(metadata.playerType);
  const gender = readGender(metadata.gender);
  if (!displayName) return null;

  return {
    displayName,
    requestedPlayerId: requestedPlayerId || undefined,
    submittedName: submittedName || undefined,
    submittedPdgaNumber: readString(metadata.submittedPdgaNumber),
    seasonId: readString(metadata.seasonId) || undefined,
    requestedTeamId: readString(metadata.requestedTeamId) || undefined,
    playerType,
    gender,
    playedBefore: readBoolean(metadata.playedBefore),
  };
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return undefined;
}

function readPlayerType(value: unknown): 'Adult' | 'Junior' | undefined {
  return value === 'Adult' || value === 'Junior' ? value : undefined;
}

function readGender(value: unknown): 'Male' | 'Female' | undefined {
  return value === 'Male' || value === 'Female' ? value : undefined;
}
