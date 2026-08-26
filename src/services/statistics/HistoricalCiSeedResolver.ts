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
  source: 'HistoricalPDGA' | 'HistoricalOverride' | 'Provisional';
};

const CONFIRMED_HISTORICAL_NAME_ALIASES = new Map<string, string>([
  ['william deering', 'will deering'],
  ['ilya batazhan', 'eli batazhan'],
  ['travis bochum', 'travis baucom'],
  ['stephen ajov', 'steven absher'],
  ['christopher king jr', 'christopher king'],
]);

const CONFIRMED_HISTORICAL_SEED_OVERRIDES = new Map<string, number>([
  ['coastal-clash-2024-2025:john-loyd', 900],
  ['coastal-clash-2025-2026:john-loyd', 900],
  ['coastal-clash-2024-2025:thomas-vaughn', 900],
  ['coastal-clash-2025-2026:thomas-vaughn', 900],
  ['coastal-clash-2024-2025:ray-ledbetter', 900],
  ['coastal-clash-2025-2026:ray-ledbetter', 900],
  ['coastal-clash-2025-2026:aj-lehmann', 850],
  ['coastal-clash-2025-2026:peter-hourigan', 850],
  ['coastal-clash-2025-2026:hunter-gainey', 900],
  ['coastal-clash-2025-2026:roy-strawderman', 850],
  ['coastal-clash-2025-2026:nick-king', 875],
  ['coastal-clash-2025-2026:alex-efting', 825],
  ['coastal-clash-2024-2025:angel-mabee', 700],
  ['coastal-clash-2024-2025:ben-morrow', 783],
  ['coastal-clash-2024-2025:brandon-jamison', 900],
  ['coastal-clash-2024-2025:darian-green', 870],
  ['coastal-clash-2024-2025:jamie-hensley', 847],
  ['coastal-clash-2024-2025:john-grant', 900],
  ['coastal-clash-2024-2025:mike-wooten', 920],
  ['coastal-clash-2024-2025:sean-mansell', 910],
  ['coastal-clash-2024-2025:travis-baucom', 920],
  ['coastal-clash-2025-2026:ariel-cosimo', 773],
  ['coastal-clash-2025-2026:brandon-long', 925],
  ['coastal-clash-2025-2026:clif-smith', 890],
  ['coastal-clash-2025-2026:trent-bailey', 825],
  ['coastal-clash-2024-2025:abby-bertone', 700],
  ['coastal-clash-2024-2025:bailey-nichols', 825],
  ['coastal-clash-2024-2025:brett-patrick', 970],
  ['coastal-clash-2024-2025:logan-hitchcock', 850],
  ['coastal-clash-2024-2025:jason-long', 861],
  ['coastal-clash-2024-2025:alex-bradshaw', 900],
  ['coastal-clash-2024-2025:amanda-valois', 650],
  ['coastal-clash-2024-2025:ashlee-hynds', 650],
  ['coastal-clash-2024-2025:austin-gratton', 900],
  ['coastal-clash-2024-2025:brandon-cosimo', 860],
  ['coastal-clash-2024-2025:brian-parker', 960],
  ['coastal-clash-2024-2025:seth-brown', 858],
  ['coastal-clash-2025-2026:jackie-brown-alcott', 750],
  ['coastal-clash-2025-2026:jeff-king', 900],
  ['coastal-clash-2024-2025:cody-biggs', 900],
  ['coastal-clash-2024-2025:georgia-busch', 600],
  ['coastal-clash-2024-2025:scott-strickland', 925],
  ['coastal-clash-2024-2025:bobby-phillips', 825],
  ['coastal-clash-2024-2025:brandon-roy', 825],
  ['coastal-clash-2024-2025:cecelia-costin', 700],
  ['coastal-clash-2024-2025:david-thompson', 825],
  ['coastal-clash-2024-2025:jesse-smelik', 825],
  ['coastal-clash-2024-2025:jodie-lehman', 700],
  ['coastal-clash-2024-2025:julie-nassisi', 700],
  ['coastal-clash-2024-2025:kim-mchale', 700],
  ['coastal-clash-2024-2025:kyle-paige', 825],
  ['coastal-clash-2024-2025:mike-jones', 825],
  ['coastal-clash-2024-2025:mizz', 825],
  ['coastal-clash-2024-2025:richie-abshner', 825],
  ['coastal-clash-2024-2025:daniel-johnson', 920],
  ['coastal-clash-2024-2025:tracy-woodlard', 700],
  ['coastal-clash-2025-2026:michael-matthews', 875],
  ['coastal-clash-2024-2025:steve-lipke', 825],
  ['coastal-clash-2025-2026:anthony-hardee', 825],
  ['coastal-clash-2025-2026:blake-eadie', 825],
  ['coastal-clash-2025-2026:brandon-killian', 825],
  ['coastal-clash-2025-2026:brian-steward', 825],
  ['coastal-clash-2025-2026:cecelia-costin', 700],
  ['coastal-clash-2025-2026:jason-long', 861],
  ['coastal-clash-2025-2026:jeff-parsley', 825],
  ['coastal-clash-2025-2026:jodie-lehman', 700],
  ['coastal-clash-2025-2026:lizzie-goddard', 700],
  ['coastal-clash-2025-2026:logan-hitchcock', 850],
  ['coastal-clash-2025-2026:lucian-odom', 875],
  ['coastal-clash-2024-2025:stev-absher', 940],
  ['coastal-clash-2025-2026:christopher-king-jr', 963],
  ['coastal-clash-2025-2026:sarah-moore', 700],
  ['coastal-clash-2025-2026:will-lindsey', 900],
  ['coastal-clash-2025-2026:rosa-carroll', 700],
  ['coastal-clash-2025-2026:shannon-boney', 700],
  ['coastal-clash-2025-2026:travis-webster', 825],
  ['coastal-clash-2025-2026:zach-teague', 825],
  ['coastal-clash-2024-2025:mark-bostic', 913],
  ['coastal-clash-2025-2026:mark-bostic', 937],
  ['coastal-clash-2024-2025:tommy-phillips', 936],
  ['coastal-clash-2025-2026:tommy-phillips', 936],
  ['coastal-clash-2024-2025:nicki-irrea', 915],
]);

/**
 * Converts the legacy name-based seed table into canonical player-ID seed
 * metadata for the current CI replay.
 *
 * Explicit reviewed season/player overrides take precedence when no trustworthy
 * historical PDGA anchor exists. Otherwise only explicit historical PDGA rows
 * are treated as an external rating anchor. Legacy GHOST values are ignored
 * because the finalized model owns provisional baselines (Open 825 / Women 700).
 * Confirmed historical name aliases are canonicalized before lookup so known
 * identity repairs do not lose a valid historical PDGA seed.
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
    const explicitOverride = CONFIRMED_HISTORICAL_SEED_OVERRIDES.get(`${seasonId}:${participant.playerId}`);
    const pdgaRating = explicitOverride
      ?? pdgaByName.get(normalizeHistoricalPlayerName(participant.playerName))
      ?? null;
    return {
      playerId: participant.playerId,
      pdgaRating,
      division: historicalDivision(participant.gender),
      source: explicitOverride != null
        ? 'HistoricalOverride'
        : pdgaRating == null
          ? 'Provisional'
          : 'HistoricalPDGA',
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
