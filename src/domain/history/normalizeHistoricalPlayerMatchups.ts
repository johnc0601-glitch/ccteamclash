import type {HistoricalPlayerMatchup} from '@/domain/history/HistoricalPlayerMatchup';

type CanonicalIdentity = {id: string; name: string};

const IDENTITY_ALIASES: Record<string, CanonicalIdentity> = {
  'travis-bochum': {id: 'travis-baucom', name: 'Travis Baucom'},
  'ilya-batazhan': {id: 'eli-batazhan', name: 'Eli Batazhan'},
  'stephen-ajov': {id: 'stev-absher', name: 'Stev Absher'},
  'kurtis-brandenburg': {id: 'kurty-mcgurty', name: 'Kurty McGurty'},
};

const CANONICAL_IDENTITIES = new Map<string, CanonicalIdentity>();
for (const identity of Object.values(IDENTITY_ALIASES)) {
  CANONICAL_IDENTITIES.set(identity.id, identity);
}
CANONICAL_IDENTITIES.set('isaac-cotson', {id: 'isaac-cotson', name: 'Isaac Kotson'});

const SIDE_REPAIRS = new Map<string, {historicalTeamMatchId: number; playerSide: 'Home' | 'Away'}>([
  ['historical-match:14c25c8c584b6ee5ef549a7b', {historicalTeamMatchId: 29, playerSide: 'Away'}],
  ['historical-match:cb8b3bfe47b2773e511b0944', {historicalTeamMatchId: 29, playerSide: 'Away'}],
  ['historical-match:5f82d6a791b4bc9be32ed44e', {historicalTeamMatchId: 29, playerSide: 'Home'}],
]);

const SYNTHETIC_2025_26_ROWS: HistoricalPlayerMatchup[] = [
  {
    deduplicationKey: 'historical-repair:2025-2026:november:cc-ninjas:doubles:logan-canale',
    seasonId: 'coastal-clash-2025-2026', seasonName: '2025-2026', eventLabel: 'November', eventMonth: 'November', eventOrder: 2,
    format: 'Doubles', playerId: 'logan-canale', playerName: 'Logan Canale', playerTeamId: 'cougar-country', playerTeamName: 'Cougar Country',
    partnerPlayerId: 'brianna-kinsman', partnerPlayerName: 'Brianna Kinsman', opponentOnePlayerId: 'nadya-gutierrez', opponentOnePlayerName: 'Nadya Gutierrez',
    opponentTwoPlayerId: 'nicole-pierre', opponentTwoPlayerName: 'Nicole Pierre', opponentTeamId: 'ninjas', opponentTeamName: 'Ninjas',
    outcome: 'L', rawResult: 'L', rawScore: null, sourceWorkbook: "Coastal Clash Match Play '25_'26.xlsx", sourceSheet: 'November', sourceRow: 34,
    historicalTeamMatchId: 23, playerSide: 'Away', homeAwayValidated: true,
  },
  {
    deduplicationKey: 'historical-repair:2025-2026:november:cc-ninjas:doubles:brianna-kinsman',
    seasonId: 'coastal-clash-2025-2026', seasonName: '2025-2026', eventLabel: 'November', eventMonth: 'November', eventOrder: 2,
    format: 'Doubles', playerId: 'brianna-kinsman', playerName: 'Brianna Kinsman', playerTeamId: 'cougar-country', playerTeamName: 'Cougar Country',
    partnerPlayerId: 'logan-canale', partnerPlayerName: 'Logan Canale', opponentOnePlayerId: 'nadya-gutierrez', opponentOnePlayerName: 'Nadya Gutierrez',
    opponentTwoPlayerId: 'nicole-pierre', opponentTwoPlayerName: 'Nicole Pierre', opponentTeamId: 'ninjas', opponentTeamName: 'Ninjas',
    outcome: 'L', rawResult: 'L', rawScore: null, sourceWorkbook: "Coastal Clash Match Play '25_'26.xlsx", sourceSheet: 'November', sourceRow: 34,
    historicalTeamMatchId: 23, playerSide: 'Away', homeAwayValidated: true,
  },
  {
    deduplicationKey: 'historical-repair:2025-2026:december:kb-ninjas:doubles:nadya-gutierrez',
    seasonId: 'coastal-clash-2025-2026', seasonName: '2025-2026', eventLabel: 'December', eventMonth: 'December', eventOrder: 3,
    format: 'Doubles', playerId: 'nadya-gutierrez', playerName: 'Nadya Gutierrez', playerTeamId: 'ninjas', playerTeamName: 'Ninjas',
    partnerPlayerId: 'nicole-pierre', partnerPlayerName: 'Nicole Pierre', opponentOnePlayerId: 'crystal-fussell', opponentOnePlayerName: 'Crystal Fussell',
    opponentTwoPlayerId: 'ariel-cosimo', opponentTwoPlayerName: 'Ariel Cosimo', opponentTeamId: 'kb', opponentTeamName: 'KB',
    outcome: 'W', rawResult: 'W', rawScore: null, sourceWorkbook: "Coastal Clash Match Play '25_'26.xlsx", sourceSheet: 'December', sourceRow: 34,
    historicalTeamMatchId: 29, playerSide: 'Home', homeAwayValidated: true,
  },
  {
    deduplicationKey: 'historical-repair:2025-2026:december:kb-ninjas:doubles:nicole-pierre',
    seasonId: 'coastal-clash-2025-2026', seasonName: '2025-2026', eventLabel: 'December', eventMonth: 'December', eventOrder: 3,
    format: 'Doubles', playerId: 'nicole-pierre', playerName: 'Nicole Pierre', playerTeamId: 'ninjas', playerTeamName: 'Ninjas',
    partnerPlayerId: 'nadya-gutierrez', partnerPlayerName: 'Nadya Gutierrez', opponentOnePlayerId: 'crystal-fussell', opponentOnePlayerName: 'Crystal Fussell',
    opponentTwoPlayerId: 'ariel-cosimo', opponentTwoPlayerName: 'Ariel Cosimo', opponentTeamId: 'kb', opponentTeamName: 'KB',
    outcome: 'W', rawResult: 'W', rawScore: null, sourceWorkbook: "Coastal Clash Match Play '25_'26.xlsx", sourceSheet: 'December', sourceRow: 34,
    historicalTeamMatchId: 29, playerSide: 'Home', homeAwayValidated: true,
  },
];

export function canonicalHistoricalPlayerId(playerId: string): string {
  return IDENTITY_ALIASES[playerId]?.id ?? playerId;
}

export function historicalPlayerLookupIds(playerId: string): string[] {
  const canonicalId = canonicalHistoricalPlayerId(playerId);
  return [
    canonicalId,
    ...Object.entries(IDENTITY_ALIASES)
      .filter(([, identity]) => identity.id === canonicalId)
      .map(([alias]) => alias),
  ];
}

export function normalizeHistoricalPlayerMatchup(row: HistoricalPlayerMatchup): HistoricalPlayerMatchup {
  let normalized = {...row};
  normalized = canonicalizeSlot(normalized, 'playerId', 'playerName');
  normalized = canonicalizeSlot(normalized, 'partnerPlayerId', 'partnerPlayerName');
  normalized = canonicalizeSlot(normalized, 'opponentOnePlayerId', 'opponentOnePlayerName');
  normalized = canonicalizeSlot(normalized, 'opponentTwoPlayerId', 'opponentTwoPlayerName');

  const sideRepair = SIDE_REPAIRS.get(normalized.deduplicationKey);
  if (sideRepair) {
    normalized = {
      ...normalized,
      historicalTeamMatchId: sideRepair.historicalTeamMatchId,
      playerSide: sideRepair.playerSide,
      homeAwayValidated: true,
    };
  }

  if (
    normalized.seasonName === '2025-2026'
    && normalized.eventLabel === 'March Semifinals'
    && ((normalized.playerTeamName === 'Beast Mode' && normalized.opponentTeamName === 'Riptide')
      || (normalized.playerTeamName === 'Riptide' && normalized.opponentTeamName === 'Beast Mode'))
  ) {
    normalized = {...normalized, eventLabel: 'March Championship', eventOrder: 7};
  }

  return normalized;
}

export function normalizeAndCompleteHistoricalPlayerMatchups(
  rows: HistoricalPlayerMatchup[],
  seasonId?: string,
): HistoricalPlayerMatchup[] {
  const byKey = new Map(rows.map((row) => [row.deduplicationKey, normalizeHistoricalPlayerMatchup(row)]));
  for (const synthetic of SYNTHETIC_2025_26_ROWS) {
    if (seasonId && synthetic.seasonId !== seasonId) continue;
    if (!byKey.has(synthetic.deduplicationKey)) {
      byKey.set(synthetic.deduplicationKey, normalizeHistoricalPlayerMatchup(synthetic));
    }
  }
  return [...byKey.values()];
}

function canonicalizeSlot<
  IdKey extends 'playerId' | 'partnerPlayerId' | 'opponentOnePlayerId' | 'opponentTwoPlayerId',
  NameKey extends 'playerName' | 'partnerPlayerName' | 'opponentOnePlayerName' | 'opponentTwoPlayerName',
>(row: HistoricalPlayerMatchup, idKey: IdKey, nameKey: NameKey): HistoricalPlayerMatchup {
  const id = row[idKey] as string | null;
  if (!id) return row;
  const identity = IDENTITY_ALIASES[id] ?? CANONICAL_IDENTITIES.get(id);
  if (!identity) return row;
  if (id === identity.id && row[nameKey] === identity.name) return row;
  return {...row, [idKey]: identity.id, [nameKey]: identity.name};
}
