export type ChallengeResultStatus = 'Draft' | 'Published' | 'Voided';

export type PlayerResultFormat = 'Singles' | 'Doubles';

export type PlayerResultOutcome = 'Win' | 'Loss' | 'Tie';

export type PlayerResult = {
  id: string;
  playerId: string;
  playerName: string;
  teamId: string;
  format: PlayerResultFormat;
  outcome: PlayerResultOutcome;
  pointsEarned: number;
};

export type ChallengeResult = {
  id: string;
  seasonId: string;
  challengeId: string;
  date: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  status: ChallengeResultStatus;
  playerResults: PlayerResult[];
  publishedAt: string;
};

export type RecordSummary = {
  wins: number;
  losses: number;
  ties: number;
};

export type TeamStatistics = {
  teamId: string;
  seasonId: string;
  matchesPlayed: number;
  record: RecordSummary;
  homeRecord: RecordSummary;
  awayRecord: RecordSummary;
  pointsFor: number;
  pointsAgainst: number;
  pointDifferential: number;
  pointsPercentage: number;
  currentStreak: string;
  lastFive: string[];
};

export type PlayerStatistics = {
  playerId: string;
  playerName: string;
  seasonId: string;
  teamIds: string[];
  matchesPlayed: number;
  finalsQualified: boolean;
  singlesRecord: RecordSummary;
  doublesRecord: RecordSummary;
  overallRecord: RecordSummary;
  winPercentage: number;
  pointsEarned: number;
  currentStreak: string;
};

export type SeasonStatistics = {
  seasonId: string;
  challengesPlayed: number;
  totalTeamPoints: number;
  averageMargin: number;
  closestChallenge: ChallengeResult | undefined;
  largestVictory: ChallengeResult | undefined;
  highestScoringChallenge: ChallengeResult | undefined;
};

export type HeadToHeadStatistics = {
  seasonId: string;
  teamAId: string;
  teamBId: string;
  recordForTeamA: RecordSummary;
  totalPointsForTeamA: number;
  totalPointsForTeamB: number;
  lastMeeting: ChallengeResult | undefined;
  currentStreak: string;
};
