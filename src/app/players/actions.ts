'use server';

import {services} from '@/core/ServiceContainer';
import {createHistoryItems} from '@/services/playerProfiles';
import type {PlayerProfileMatchHistoryItem} from '@/services/playerProfiles';

export async function loadPlayerMatchHistory(
  playerId: string,
): Promise<PlayerProfileMatchHistoryItem[]> {
  if (!playerId || playerId.length > 200) return [];
  return createHistoryItems(await services.publicPlayers.getHistory(playerId));
}
