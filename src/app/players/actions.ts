'use server';

import {revalidatePath, revalidateTag} from 'next/cache';
import {redirect} from 'next/navigation';
import {createServerPublicPlayerService} from '@/core/createServerPublicPlayerService';
import {loadServerHistoricalCiArchiveReplay} from '@/core/loadServerHistoricalCiArchiveReplay';
import {canonicalHistoricalPlayerId} from '@/domain/history/normalizeHistoricalPlayerMatchups';
import {createClient} from '@/lib/supabase/server';
import {
  createHistoryItems,
  createProfileFromPublicPlayerView,
} from '@/services/playerProfiles';
import type {
  PlayerProfile,
  PlayerProfileMatchHistoryItem,
} from '@/services/playerProfiles';

type CaptainFreeAgentClient = {
  rpc: (
    fn: 'captain_claim_launch_free_agent' | 'captain_review_launch_player_application',
    args: {target_application_id: string},
  ) => Promise<{error: {message: string} | null}>;
};

type CaptainListedPlayerClient = {
  rpc: (
    fn: 'captain_add_listed_unassigned_player',
    args: {target_player_id: string},
  ) => Promise<{error: {message: string} | null}>;
};

export async function loadPublicPlayerProfile(playerId: string): Promise<PlayerProfile | null> {
  const normalizedPlayerId = playerId.trim();
  if (!normalizedPlayerId || normalizedPlayerId.length > 200) return null;

  const service = await createServerPublicPlayerService();
  const views = await service.getAll('all', normalizedPlayerId);
  const view = views.find(({player}) => player.id === normalizedPlayerId);
  return view ? createProfileFromPublicPlayerView(view) : null;
}

export async function loadCaptainPickupAccess(): Promise<{canManage: boolean; teamName?: string}> {
  try {
    const supabase = await createClient();
    const {data: {user}, error: userError} = await supabase.auth.getUser();
    if (userError || !user) return {canManage: false};

    const {data: profile, error: profileError} = await (supabase as any)
      .from('launch_profiles')
      .select('role,status,captain_team_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (
      profileError
      || profile?.status !== 'Approved'
      || (profile?.role !== 'Captain' && profile?.role !== 'Commissioner')
      || !profile?.captain_team_id
    ) {
      return {canManage: false};
    }

    const {data: team} = await (supabase as any)
      .from('launch_teams')
      .select('name')
      .eq('id', profile.captain_team_id)
      .maybeSingle();

    return {
      canManage: true,
      teamName: typeof team?.name === 'string' ? team.name : undefined,
    };
  } catch {
    return {canManage: false};
  }
}

export async function captainAddListedPlayer(formData: FormData) {
  const playerId = readFormValue(formData, 'playerId');
  const returnSearch = readFormValue(formData, 'returnSearch').slice(0, 100);
  const returnPath = `/players?search=${encodeURIComponent(returnSearch)}`;

  if (!playerId) {
    redirect(`${returnPath}&error=${encodeURIComponent('Player is required.')}`);
  }

  const supabase = await createClient();
  const {data: {user}, error: userError} = await supabase.auth.getUser();
  if (userError || !user) redirect('/account?error=Sign in first.');

  const {error} = await (supabase as unknown as CaptainListedPlayerClient).rpc(
    'captain_add_listed_unassigned_player',
    {target_player_id: playerId},
  );
  if (error) {
    redirect(`${returnPath}&error=${encodeURIComponent(error.message)}`);
  }

  revalidateCaptainPlayerPages();
  redirect(`${returnPath}&notice=${encodeURIComponent('Player added to your team roster.')}`);
}

export async function captainAddFreeAgent(formData: FormData) {
  const applicationId = readFormValue(formData, 'applicationId');
  const returnSearch = readFormValue(formData, 'returnSearch').slice(0, 100);
  const returnPath = `/players?search=${encodeURIComponent(returnSearch)}`;

  if (!applicationId) {
    redirect(`${returnPath}&error=${encodeURIComponent('Free agent application is required.')}`);
  }

  const supabase = await createClient();
  const {data: {user}, error: userError} = await supabase.auth.getUser();
  if (userError || !user) redirect('/account?error=Sign in first.');

  const client = supabase as unknown as CaptainFreeAgentClient;
  const {error: claimError} = await client.rpc(
    'captain_claim_launch_free_agent',
    {target_application_id: applicationId},
  );
  if (claimError) {
    redirect(`${returnPath}&error=${encodeURIComponent(claimError.message)}`);
  }

  const {error: approvalError} = await client.rpc(
    'captain_review_launch_player_application',
    {target_application_id: applicationId},
  );
  if (approvalError) {
    revalidateCaptainPlayerPages();
    redirect(`/captain?error=${encodeURIComponent(
      `Player was claimed, but roster approval needs attention: ${approvalError.message}`,
    )}`);
  }

  revalidateCaptainPlayerPages();
  redirect(`${returnPath}&notice=${encodeURIComponent('Player added to your team roster.')}`);
}

export async function loadPlayerMatchHistory(
  playerId: string,
): Promise<PlayerProfileMatchHistoryItem[]> {
  if (!playerId || playerId.length > 200) return [];
  const canonicalPlayerId = canonicalHistoricalPlayerId(playerId);
  const history = await (await createServerPublicPlayerService()).getHistory(canonicalPlayerId);
  const items = createHistoryItems(history);

  try {
    const replay = await loadServerHistoricalCiArchiveReplay();
    const historicalDeltaById = new Map(
      replay.ledger
        .filter((fact) => fact.player_id === canonicalPlayerId)
        .map((fact) => [fact.matchup_deduplication_key, fact.ci_delta] as const),
    );
    return items.map((item) => item.ciDelta !== undefined
      ? item
      : historicalDeltaById.has(item.id)
        ? {...item, ciDelta: historicalDeltaById.get(item.id)}
        : item);
  } catch {
    // Match history itself remains available if a future archive import needs
    // reconciliation; only the CI movement annotation is omitted in that case.
    return items;
  }
}

function revalidateCaptainPlayerPages() {
  revalidateTag('public:players', 'max');
  revalidateTag('public:stats', 'max');
  revalidateTag('public:teams', 'max');
  revalidatePath('/players');
  revalidatePath('/captain');
  revalidatePath('/office/players');
  revalidatePath('/account');
  revalidatePath('/teams');
  revalidatePath('/stats');
}

function readFormValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim() : '';
}
