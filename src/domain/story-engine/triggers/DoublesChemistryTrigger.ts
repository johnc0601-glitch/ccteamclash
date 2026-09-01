import type {RatedResult} from '../RatedResult';
import type {StoryCandidateDraft} from '../StoryCandidate';

export const DOUBLES_CHEMISTRY_MIN_CONTESTS = 4;
export const DOUBLES_CHEMISTRY_MIN_WIN_RATE = 0.75;
export const DOUBLES_CHEMISTRY_MIN_ABOVE_EXPECTED = 1;

type PairGroup = {
  playerIds: [string, string];
  rows: RatedResult[];
};

type PairStats = {
  contests: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  expectedPoints: number;
  actualPoints: number;
  performanceVsExpected: number;
};

type ChemistryFieldEntry = {
  key: string;
  stats: PairStats;
  strength: number;
};

function pairKey(ids: string[]): string | null {
  if (ids.length !== 2 || ids[0] === ids[1]) return null;
  return [...ids].sort().join('\u0000');
}

function stats(rows: RatedResult[]): PairStats {
  const contests = rows.length;
  const wins = rows.filter((row) => row.outcome === 'W').length;
  const losses = rows.filter((row) => row.outcome === 'L').length;
  const ties = rows.filter((row) => row.outcome === 'T').length;
  const expectedPoints = rows.reduce((sum, row) => sum + row.expectedPoints, 0);
  const actualPoints = rows.reduce((sum, row) => sum + row.actualPoints, 0);
  return {
    contests,
    wins,
    losses,
    ties,
    winRate: contests ? wins / contests : 0,
    expectedPoints,
    actualPoints,
    performanceVsExpected: actualPoints - expectedPoints,
  };
}

function qualifies(value: PairStats): boolean {
  return value.contests >= DOUBLES_CHEMISTRY_MIN_CONTESTS
    && (value.winRate >= DOUBLES_CHEMISTRY_MIN_WIN_RATE
      || value.performanceVsExpected >= DOUBLES_CHEMISTRY_MIN_ABOVE_EXPECTED);
}

function chemistryStrength(value: PairStats): number {
  return Math.max(
    value.winRate / DOUBLES_CHEMISTRY_MIN_WIN_RATE,
    value.performanceVsExpected / DOUBLES_CHEMISTRY_MIN_ABOVE_EXPECTED,
  );
}

function magnitude(value: PairStats): number {
  const winRateBonus = Math.max(0, value.winRate - DOUBLES_CHEMISTRY_MIN_WIN_RATE) * 100;
  const expectationBonus = Math.max(0, value.performanceVsExpected - DOUBLES_CHEMISTRY_MIN_ABOVE_EXPECTED) * 15;
  const sampleBonus = Math.max(0, Math.min(15, (value.contests - DOUBLES_CHEMISTRY_MIN_CONTESTS) * 5));
  return Math.max(0, Math.min(100, 55 + winRateBonus + expectationBonus + sampleBonus));
}

function rarityFromField(eligiblePairs: number, qualifyingPairs: number): number {
  if (eligiblePairs <= 1) return 100;
  return Math.max(0, Math.min(100, 100 - ((Math.max(1, qualifyingPairs) - 1) / eligiblePairs) * 100));
}

/**
 * Detects a doubles pair when it first reaches a meaningful body of evidence:
 * at least four shared contests and either a 75% win rate or one full win above
 * model expectation. A pair that remains qualified does not emit every round.
 */
export function detectDoublesChemistry(results: RatedResult[]): StoryCandidateDraft[] {
  const groups = new Map<string, PairGroup>();

  for (const result of results) {
    if (result.format !== 'Doubles') continue;
    const key = pairKey(result.subjectPlayerIds);
    if (!key) continue;
    const playerIds = [...result.subjectPlayerIds].sort() as [string, string];
    const groupKey = `${result.seasonId}\u0000${key}`;
    const group = groups.get(groupKey) ?? {playerIds, rows: []};
    group.rows.push(result);
    groups.set(groupKey, group);
  }

  for (const group of groups.values()) {
    group.rows.sort((a, b) => a.playedAt.localeCompare(b.playedAt) || a.id.localeCompare(b.id));
  }

  const fieldBySeason = new Map<string, ChemistryFieldEntry[]>();
  for (const [key, group] of groups) {
    const latest = group.rows.at(-1);
    if (!latest) continue;
    const current = stats(group.rows);
    if (current.contests < DOUBLES_CHEMISTRY_MIN_CONTESTS) continue;
    const entries = fieldBySeason.get(latest.seasonId) ?? [];
    entries.push({key, stats: current, strength: chemistryStrength(current)});
    fieldBySeason.set(latest.seasonId, entries);
  }

  const candidates: StoryCandidateDraft[] = [];
  for (const [groupKey, group] of groups) {
    const latest = group.rows.at(-1);
    if (!latest) continue;

    const current = stats(group.rows);
    if (!qualifies(current)) continue;
    const prior = stats(group.rows.slice(0, -1));
    if (qualifies(prior)) continue;

    const field = fieldBySeason.get(latest.seasonId) ?? [];
    const qualifyingField = field.filter((entry) => qualifies(entry.stats));
    const targetStrength = chemistryStrength(current);
    const seasonRank = 1 + qualifyingField.filter((entry) => entry.key !== groupKey && entry.strength > targetStrength).length;
    const rarity = rarityFromField(field.length, qualifyingField.length);

    const namesById = new Map(latest.subjectPlayerIds.map((id, index) => [id, latest.subjectNames[index] ?? id]));
    const pairNames = group.playerIds.map((id) => namesById.get(id) ?? id);
    const qualification = current.winRate >= DOUBLES_CHEMISTRY_MIN_WIN_RATE
      && current.performanceVsExpected >= DOUBLES_CHEMISTRY_MIN_ABOVE_EXPECTED
      ? 'WIN_RATE_AND_EXPECTATION'
      : current.winRate >= DOUBLES_CHEMISTRY_MIN_WIN_RATE ? 'WIN_RATE' : 'ABOVE_EXPECTATION';

    candidates.push({
      id: `doubles-chemistry:${latest.seasonId}:${group.playerIds.join(':')}:${latest.id}`,
      triggerType: 'DOUBLES_CHEMISTRY',
      seasonId: latest.seasonId,
      eventId: latest.eventId,
      matchId: latest.matchId,
      playerIds: [...group.playerIds],
      teamIds: [latest.teamId],
      headlineFacts: {
        resultId: latest.id,
        playerOne: pairNames[0],
        playerTwo: pairNames[1],
        team: latest.teamName,
        contests: current.contests,
        wins: current.wins,
        losses: current.losses,
        ties: current.ties,
        winRatePct: Math.round(current.winRate * 1000) / 10,
        performanceVsExpected: Math.round(current.performanceVsExpected * 100) / 100,
        qualification,
      },
      contextFacts: {
        expectedPoints: Math.round(current.expectedPoints * 100) / 100,
        actualPoints: Math.round(current.actualPoints * 100) / 100,
        qualifiedAt: latest.playedAt,
        seasonChemistryRank: seasonRank,
        seasonEligiblePairs: field.length,
        seasonQualifyingPairs: qualifyingField.length,
      },
      scores: {
        magnitude: magnitude(current),
        rarity,
        historicalSignificance: seasonRank === 1 ? 80 : seasonRank <= 3 ? 65 : 50,
        recency: 100,
        standingsSignificance: 0,
        opponentQuality: 0,
      },
    });
  }

  return candidates.sort((a, b) =>
    Number(a.contextFacts.seasonChemistryRank) - Number(b.contextFacts.seasonChemistryRank)
    || Number(b.headlineFacts.performanceVsExpected) - Number(a.headlineFacts.performanceVsExpected)
    || Number(b.headlineFacts.winRatePct) - Number(a.headlineFacts.winRatePct)
    || a.id.localeCompare(b.id),
  );
}
