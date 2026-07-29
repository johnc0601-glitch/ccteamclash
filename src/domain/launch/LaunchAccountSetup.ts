import type {SupabaseClient, User} from '@supabase/supabase-js';
import {LaunchService} from '@/domain/launch/LaunchService';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import type {Database} from '@/lib/supabase/database';

type LaunchSupabaseClient = SupabaseClient<Database>;

type LaunchSignupMetadata = {
  displayName?: unknown;
  requestedPlayerId?: unknown;
  submittedName?: unknown;
  submittedPdgaNumber?: unknown;
};

export type LaunchSignupInput = {
  displayName: string;
  requestedPlayerId?: string;
  submittedName?: string;
  submittedPdgaNumber?: string;
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
  if (!displayName) return null;

  return {
    displayName,
    requestedPlayerId: requestedPlayerId || undefined,
    submittedName: submittedName || undefined,
    submittedPdgaNumber: readString(metadata.submittedPdgaNumber),
  };
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
