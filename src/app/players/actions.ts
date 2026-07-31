'use server';

import {createServerPublicPlayerService} from '@/core/createServerPublicPlayerService';
import {createHistoryItems} from '@/services/playerProfiles';
import type {PlayerProfileMatchHistoryItem} from '@/services/playerProfiles';

export async function loadPlayerMatchHistory(
  playerId: string,
): Promise<PlayerProfileMatchHistoryItem[]> {
  if (!playerId || playerId.length > 200) return [];
  return createHistoryItems(await (await createServerPublicPlayerService()).getHistory(playerId));
}
