import type {ClashVenue} from '@/domain/story-engine/ClashPrediction';
import type {HistoricalPlayerMatchup} from '@/domain/history/HistoricalPlayerMatchup';
import {
  prepareHistoricalCiLedgerInserts,
  type HistoricalCiLedgerInsert,
} from './HistoricalCiMovementBackfill';
import {
  replayHistoricalCiSeason,
  type HistoricalCiSeasonReplayResult,
} from './HistoricalCiSeasonReplay';
import {
  resolveHistoricalCiSeeds,
  type HistoricalCiParticipant,
  type HistoricalLegacySeed,
} from './HistoricalCiSeedResolver';

export type HistoricalCiArchiveSeason = {
  seasonId: string;
  rows: HistoricalPlayerMatchup[];
  participants: HistoricalCiParticipant[];
  legacySeeds: HistoricalLegacySeed[];
  venueByTeamMatchId?: ReadonlyMap<number, ClashVenue>;
};

export type HistoricalCiArchiveReplayResult = {
  seasons: Map<string, HistoricalCiSeasonReplayResult>;
  ledger: HistoricalCiLedgerInsert[];
  finalRatings: Map<string, number>;
};

/**
 * Replays historical seasons in the supplied chronological order using one CI
 * model and one canonical player-ID rating chain.
 *
 * Each season resolves only explicit historical PDGA seeds. Legacy ghost values
 * are ignored in favor of the finalized 825/700 provisional baselines. Ending
 * CI from one season becomes prior CI for the next season's 80/20 reset. Reset
 * movement never enters the immutable contest ledger or CI +/- totals.
 */
export function replayHistoricalCiArchive(
  archive: HistoricalCiArchiveSeason[],
): HistoricalCiArchiveReplayResult {
  const seasons = new Map<string, HistoricalCiSeasonReplayResult>();
  const ledger: HistoricalCiLedgerInsert[] = [];
  let priorEndingRatings = new Map<string, number>();

  for (const season of archive) {
    if (seasons.has(season.seasonId)) {
      throw new Error(`Duplicate historical CI season ${season.seasonId}`);
    }

    const players = resolveHistoricalCiSeeds(
      season.seasonId,
      season.participants,
      season.legacySeeds,
    );
    const replay = replayHistoricalCiSeason({
      rows: season.rows,
      players,
      priorEndingRatings,
      venueByTeamMatchId: season.venueByTeamMatchId,
    });

    seasons.set(season.seasonId, replay);
    ledger.push(...prepareHistoricalCiLedgerInserts(replay));
    priorEndingRatings = new Map(replay.endingRatings);
  }

  const uniqueKeys = new Set(ledger.map((row) => row.matchup_deduplication_key));
  if (uniqueKeys.size !== ledger.length) {
    throw new Error('Historical CI archive generated duplicate ledger keys');
  }

  return {seasons, ledger, finalRatings: priorEndingRatings};
}
