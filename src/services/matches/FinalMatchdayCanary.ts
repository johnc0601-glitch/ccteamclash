import type {
  FinalMatchContest as ExistingContest,
  FinalMatchdaySnapshot,
} from './FinalMatchdaySnapshot';

export type {
  FinalMatchPlayer,
  FinalMatchTeam,
  FinalMatchCourse,
  FinalMatchWeather,
} from './FinalMatchdaySnapshot';

export type FinalMatchContest = ExistingContest & {
  resultText?: string;
  card?: number;
  startingHole?: string;
  homeStrokes?: number;
  awayStrokes?: number;
};

export type FinalScoreAdjustment = {
  awardedTeamId: string;
  category: 'NoShow' | 'WomenBonus' | 'Penalty' | 'Other' | 'UnplayedSlot';
  points: number;
  note: string | null;
};

export type FinalMatchdayV2Snapshot = Omit<FinalMatchdaySnapshot, 'contests'> & {
  contests: FinalMatchContest[];
  adjustments: FinalScoreAdjustment[];
};

/** Immutable, single-match, publication-gated rollout.
 * No changes to existing final snapshot parsing or locked match records.
 * The existing Commissioner Results editor and CI publishing are unchanged.
 */
const CANARY_MATCH_ID = 'beast-mode-vs-riptide-3ed22cf9-623e-4c11-96a2-b0e6c42b7e0d';
const CANARY_DATE = '2026-10-17';

export function shouldUseFinalScoreboardCanary(snapshot: FinalMatchdaySnapshot): boolean {
  return process.env.RIPTIDE_BEAST_SCOREBOARD_V2 !== 'off'
    && snapshot.matchId === CANARY_MATCH_ID
    && snapshot.date === CANARY_DATE
    && snapshot.awayTeam.id === 'beast-mode'
    && snapshot.homeTeam.id === 'riptide'
    && Boolean(snapshot.publishedAt);
}

/**
 * Published scoring adjustments live in the separate locked results ledger.
 * They are not embedded in the historic frozen Matchday snapshot. Read them
 * server-side ONLY for the existing V2 canary match; never mutate either table.
 */
export async function loadPublishedCanaryAdjustments(
  client: {from: (table: string) => any},
  snapshot: FinalMatchdaySnapshot,
): Promise<FinalScoreAdjustment[]> {
  if (!shouldUseFinalScoreboardCanary(snapshot)) return [];

  try {
    const {data, error} = await client.from('launch_match_structural_points')
      .select('awarded_team_id,category,points,note')
      .eq('match_id', snapshot.matchId)
      .order('category');
    if (error) {
      console.error('Published Matchday adjustment ledger is unavailable.', {
        matchId: snapshot.matchId,
        code: error.code,
      });
      return [];
    }
    return parsePublishedCanaryAdjustments(data, snapshot.awayTeam.id, snapshot.homeTeam.id);
  } catch (error) {
    console.error('Could not read final Matchday scoring adjustments.', {
      matchId: snapshot.matchId,
      error: error instanceof Error ? error.message : 'Unknown read error',
    });
    return [];
  }
}

export function parsePublishedCanaryAdjustments(
  input: unknown,
  awayTeamId: string,
  homeTeamId: string,
): FinalScoreAdjustment[] {
  if (!Array.isArray(input)) return [];
  const categories = new Set<FinalScoreAdjustment['category']>([
    'NoShow','WomenBonus','Penalty','Other','UnplayedSlot',
  ]);
  return input.flatMap((raw): FinalScoreAdjustment[] => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
    const row = raw as Record<string, unknown>;
    const awardedTeamId = row.awarded_team_id;
    const category = row.category;
    const points = typeof row.points === 'number' || typeof row.points === 'string'
      ? Number(row.points) : NaN;
    if (
      typeof awardedTeamId !== 'string'
      || (awardedTeamId !== awayTeamId && awardedTeamId !== homeTeamId)
      || !categories.has(category as FinalScoreAdjustment['category'])
      || !Number.isFinite(points) || points <= 0 || !Number.isInteger(points * 2)
    ) return [];
    return [{
      awardedTeamId,
      category: category as FinalScoreAdjustment['category'],
      points,
      note: typeof row.note === 'string' ? row.note : null,
    }];
  });
}

export function adaptCanarySnapshot(
  snapshot: FinalMatchdaySnapshot,
  adjustments: FinalScoreAdjustment[] = [],
): FinalMatchdayV2Snapshot {
  return {
    ...snapshot,
    // Copy only: the locked snapshot and published total remain immutable.
    adjustments: [...adjustments],
  };
}
