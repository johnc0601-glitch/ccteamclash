export type StatsRow = {
  playerId: string;
  playerName: string;
  teamName: string;
  teamNames: string[];
  gender: 'Open' | 'Women';
  matchesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  winPercentage: number;
  singlesWins: number;
  singlesLosses: number;
  singlesTies: number;
  doublesWins: number;
  doublesLosses: number;
  doublesTies: number;
  points: number;
  /** Earned Clash Index movement only. Undefined until the season ledger is complete. */
  ciGain?: number;
  singlesCiGain?: number;
  doublesCiGain?: number;
};

export type StatsGroup = {
  id: string;
  label: string;
  rows: StatsRow[];
};
