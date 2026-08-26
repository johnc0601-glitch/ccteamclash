import type {ClashDivision} from '@/domain/story-engine/ClashSeasonReset';

export type HistoricalLegacySeed = {
  seasonId: string;
  playerName: string;
  rating: number;
  source: string;
};

export type HistoricalCiParticipant = {
  playerId: string;
  playerName: string;
  gender?: string | null;
};

export type HistoricalResolvedSeed = {
  playerId: string;
  pdgaRating: number | null;
  division: ClashDivision;
  source: 'HistoricalPDGA' | 'Provisional';
};

const CONFIRMED_HISTORICAL_NAME_ALIASES = new Map<string, string>([
  ['william deering', 'will deering'],
  ['ilya batazhan', 'eli batazhan'],
  ['travis bochum', 'travis baucom'],
]);

/**
 * Converts the legacy name-based seed table into canonical player-ID seed
 * metadata for the current CI replay.
 *
 * Only explicit historical PDGA rows are treated as an external rating anchor.
 * Legacy GHOST values are intentionally ignored because the finalized model now
 * owns provisional baselines (Open 825 / Women 700). Confirmed historical name
 * aliases are canonicalized before lookup so known identity repairs do not lose
 * a valid historical PDGA seed. When duplicate legacy rows exist, PDGA wins over
 * GHOST instead of allowing insert order to decide.
 */
export function resolveHistoricalCiSeeds(
  seasonId: string,
  participants: HistoricalCiParticipant[],
  legacySeeds: HistoricalLegacySeed[],
): HistoricalResolvedSeed[] {
  const pdgaByName = new Map<string, number>();

  for (const seed of legacySeeds) {
    if (seed.seasonId !== seasonId || !isPdgaSource(seed.source)) continue;
    const key = normalizeHistoricalPlayerName(seed.playerName);
    const existing = pdgaByName.get(key);
    if (existing != null && existing !== seed.rating) {
      throw new Error(`Conflicting historical PDGA seeds for ${seed.playerName}`);
    }
    pdgaByName.set(key, seed.rating);
  }

  return participants.map((participant) => {
    const pdgaRating = pdgaByName.get(normalizeHistoricalPlayerName(participant.playerName)) ?? null;
    return {
      playerId: participant.playerId,
      pdgaRating,
      division: historicalDivision(participant.gender),
      source: pdgaRating == null ? 'Provisional' : 'HistoricalPDGA',
    };
  });
}

export function normalizeHistoricalPlayerName(value: string): string {
  const normalized = value.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
  return CONFIRMED_HISTORICAL_NAME_ALIASES.get(normalized) ?? normalized;
}

function isPdgaSource(source: string): boolean {
  return source.trim().toLocaleUpperCase() === 'PDGA';
}

function historicalDivision(gender?: string | null): ClashDivision {
  return gender?.trim().toLocaleLowerCase() === 'female' ? 'Women' : 'Open';
}
