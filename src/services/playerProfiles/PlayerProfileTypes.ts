import type {Player} from '@/models/Player';
import type {RecordSummary} from '@/services/statistics';

export type PlayerProfileMatchFormat = 'Singles' | 'Doubles' | 'Team';

export type PlayerProfileMatchResult = 'W' | 'L' | 'T';

export type PlayerProfileMatchHistoryItem = {
  id: string;
  seasonName: string;
  date?: string;
  format: PlayerProfileMatchFormat;
  result: PlayerProfileMatchResult | '-';
  opponentTeamName?: string;
  opponentPlayerNames: string[];
  partnerPlayerNames: string[];
  playerScore?: number;
  opponentScore?: number;
};

export type PlayerProfile = {
  player: Pick<Player, 'id' | 'name' | 'gender' | 'pdgaNumber' | 'pdgaRating'>;
  teamName: string;
  seasonName: string;
  matchesPlayed: number;
  overallRecord: RecordSummary;
  singlesRecord: RecordSummary;
  doublesRecord: RecordSummary;
  winPercentage: number;
  pointsEarned: number;
  history: PlayerProfileMatchHistoryItem[];
};
