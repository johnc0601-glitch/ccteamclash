export type HistoricalRecordTotals = {
  wins: number;
  losses: number;
  ties: number;
  matchesPlayed: number;
};

export type HistoricalPlayerRecordInput = {
  id: string;
  seasonId: string;
  teamName: string;
  playerName: string;
  pdgaNumber: string;
  pdgaRating: number | null;
  singles: HistoricalRecordTotals;
  doubles: HistoricalRecordTotals;
};

export type HistoricalTeamRecordInput = {
  id: string;
  seasonId: string;
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
  matchesPlayed: number;
  pointsEarned: number;
  pointsAvailable: number;
};

export type HistoricalSeasonImportSource = {
  id: string;
  name: string;
  sourceFilename: string;
  teamRecords: HistoricalTeamRecordInput[];
  playerRecords: HistoricalPlayerRecordInput[];
};

export type HistoricalTeamRecord = HistoricalTeamRecordInput & {
  pointsPercentage: number;
};

export type HistoricalPlayerRecord = HistoricalPlayerRecordInput & {
  overall: HistoricalRecordTotals;
  singlesWinPercentage: number;
  doublesWinPercentage: number;
  overallWinPercentage: number;
};

export type HistoricalImportStatus = 'Ready' | 'Applied';

export type HistoricalImportPreview = {
  source: HistoricalSeasonImportSource;
  status: HistoricalImportStatus;
  teamCount: number;
  playerCount: number;
  warnings: string[];
  teamRecords: HistoricalTeamRecord[];
  playerRecords: HistoricalPlayerRecord[];
};

export type HistoricalImportResult = {
  status: HistoricalImportStatus;
  appliedAt: string;
  seasonsApplied: number;
  teamRecordsApplied: number;
  playerRecordsApplied: number;
  teamsCreated: number;
  teamsUpdated: number;
  playersCreated: number;
  playersMatched: number;
};
