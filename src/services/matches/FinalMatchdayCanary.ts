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

export function adaptCanarySnapshot(snapshot: FinalMatchdaySnapshot): FinalMatchdayV2Snapshot {
  return {
    ...snapshot,
    // Current published snapshots have no itemized adjustment ledger.
    // Reconcile any non-contest score differences visibly but never recalculate
    // or write the published total.
    adjustments: [],
  };
}
