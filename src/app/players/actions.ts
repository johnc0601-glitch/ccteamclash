'use server';

import {createServerPublicPlayerService} from '@/core/createServerPublicPlayerService';
import {loadServerHistoricalCiArchiveReplay} from '@/core/loadServerHistoricalCiArchiveReplay';
import {canonicalHistoricalPlayerId} from '@/domain/history/normalizeHistoricalPlayerMatchups';
import {
  createHistoryItems,
  createProfileFromPublicPlayerView,
} from '@/services/playerProfiles';
import type {
  PlayerProfile,
  PlayerProfileMatchHistoryItem,
} from '@/services/playerProfiles';

export async function loadPublicPlayerProfile(playerId: string): Promise<PlayerProfile | null> {
  const normalizedPlayerId = playerId.trim();
  if (!normalizedPlayerId || normalizedPlayerId.length > 200) return null;

  const service = await createServerPublicPlayerService();
  const views = await service.getAll('all', normalizedPlayerId);
  const view = views.find(({player}) => player.id === normalizedPlayerId);
  return view ? createProfileFromPublicPlayerView(view) : null;
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
