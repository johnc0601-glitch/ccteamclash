import type {
  HistoricalAnalysisArchive,
  HistoricalAnalysisRecord,
  HistoricalCompetitionPhase,
  HistoricalMatchFormat,
  HistoricalSeasonAnalysisManifest,
} from '@/domain/history/HistoricalAnalysis';

/**
 * Analysis archive status is intentionally independent from the public historical
 * summaries. Missing playoff rows can be appended later without changing existing
 * regular-season record ids or rebuilding player/team history.
 */
export const HISTORICAL_ANALYSIS_MANIFESTS: HistoricalSeasonAnalysisManifest[] = [
  {
    seasonId: 'coastal-clash-2024-2025',
    seasonName: 'Coastal Clash Match Play 2024-2025',
    sourceFilenames: [
      "Coastal Clash Match Play '24_'25.xlsx",
      'CC_Team_Clash_Historical_Stats_2024-2026.xlsx',
    ],
    regularSeason: 'Partial',
    playoffs: 'Missing',
    knownGaps: [
      'Detailed regular-season rows still need to be normalized into canonical matchup records.',
      'Playoff matchup detail is not yet present in the archive and may be appended later.',
    ],
  },
  {
    seasonId: 'coastal-clash-2025-2026',
    seasonName: 'Coastal Clash Match Play 2025-2026',
    sourceFilenames: [
      "Coastal Clash Match Play '25_'26.xlsx",
      'CC_Team_Clash_Historical_Stats_2024-2026.xlsx',
      'CCTC Elo Calc - Clash Rating.xlsx',
    ],
    regularSeason: 'Partial',
    playoffs: 'Missing',
    knownGaps: [
      'Detailed matchup rows exist in source workbooks but still need canonical event/team/home-away normalization.',
      'Playoff matchup detail is incomplete and may be appended later.',
    ],
  },
];

// Populated incrementally from verified historical source rows. Keep ids stable once added.
export const HISTORICAL_ANALYSIS_RECORDS: HistoricalAnalysisRecord[] = [];

export function getHistoricalAnalysisArchive(): HistoricalAnalysisArchive {
  return {
    manifests: HISTORICAL_ANALYSIS_MANIFESTS,
    records: HISTORICAL_ANALYSIS_RECORDS,
  };
}

export function getHistoricalAnalysisRecords(filters: {
  seasonId?: string;
  phase?: HistoricalCompetitionPhase;
  format?: HistoricalMatchFormat;
  playerName?: string;
  teamName?: string;
} = {}): HistoricalAnalysisRecord[] {
  const playerName = normalize(filters.playerName);
  const teamName = normalize(filters.teamName);

  return HISTORICAL_ANALYSIS_RECORDS.filter((record) => {
    if (filters.seasonId && record.seasonId !== filters.seasonId) return false;
    if (filters.phase && record.phase !== filters.phase) return false;
    if (filters.format && record.format !== filters.format) return false;
    if (playerName && normalize(record.player.playerName) !== playerName) return false;
    if (teamName && normalize(record.player.teamName) !== teamName) return false;
    return true;
  });
}

function normalize(value: string | undefined): string {
  return value?.trim().replace(/\s+/g, ' ').toLocaleLowerCase() ?? '';
}
