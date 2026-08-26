import type {PlayerProfileMatchHistoryItem} from '@/services/playerProfiles';

export type PlayerHistorySeasonGroup = {
  seasonName: string;
  entries: PlayerProfileMatchHistoryItem[];
};

export function groupHistoryBySeason(
  history: PlayerProfileMatchHistoryItem[],
): PlayerHistorySeasonGroup[] {
  const groups = new Map<string, PlayerProfileMatchHistoryItem[]>();
  for (const entry of history) {
    const entries = groups.get(entry.seasonName) ?? [];
    entries.push(entry);
    groups.set(entry.seasonName, entries);
  }
  return [...groups].map(([seasonName, entries]) => ({seasonName, entries}));
}

export function formatHistoryVenue(entry: PlayerProfileMatchHistoryItem): string {
  return `${entry.isHome ? 'vs' : 'at'} ${entry.opponentTeamName ?? 'Opponent'} • ${entry.seasonName}`;
}

export function formatSinglesHistoryScore(entry: PlayerProfileMatchHistoryItem): string {
  return entry.playerScore !== undefined && entry.opponentScore !== undefined
    ? `${entry.playerScore}–${entry.opponentScore}`
    : entry.result;
}
