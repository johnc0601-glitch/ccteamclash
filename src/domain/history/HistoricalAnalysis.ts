export type HistoricalCompetitionPhase = 'RegularSeason' | 'Playoffs';
export type HistoricalMatchFormat = 'Singles' | 'Doubles' | 'Triples';
export type HistoricalResult = 'Win' | 'Loss' | 'Tie';
export type HistoricalVenueSide = 'Home' | 'Away' | 'Neutral' | 'Unknown';
export type HistoricalDataCompleteness = 'Complete' | 'Partial' | 'Missing';

export type HistoricalAnalysisParticipant = {
  playerId?: string;
  playerName: string;
  teamId?: string;
  teamName?: string;
  pdgaNumber?: string;
  pdgaRating?: number | null;
};

/**
 * Canonical, analysis-first representation of one rated side of a historical result.
 *
 * A singles match normally produces two mirrored records (one per player). A doubles
 * match normally produces four mirrored records (one per player). Keeping the player
 * perspective explicit makes Elo/Clash studies, partner studies, home/away studies,
 * and player history queries cheap while retaining opponent context.
 */
export type HistoricalAnalysisRecord = {
  id: string;
  seasonId: string;
  seasonName: string;
  phase: HistoricalCompetitionPhase;
  eventId?: string;
  eventName?: string;
  eventDate?: string;
  roundNumber?: number;
  matchupId?: string;
  venueSide: HistoricalVenueSide;
  format: HistoricalMatchFormat;
  result: HistoricalResult;
  player: HistoricalAnalysisParticipant;
  partner?: HistoricalAnalysisParticipant;
  opponents: HistoricalAnalysisParticipant[];
  sourceFilename: string;
  sourceSheet?: string;
  sourceRow?: number;
  notes?: string[];
};

export type HistoricalSeasonAnalysisManifest = {
  seasonId: string;
  seasonName: string;
  sourceFilenames: string[];
  regularSeason: HistoricalDataCompleteness;
  playoffs: HistoricalDataCompleteness;
  knownGaps: string[];
};

export type HistoricalAnalysisArchive = {
  manifests: HistoricalSeasonAnalysisManifest[];
  records: HistoricalAnalysisRecord[];
};
