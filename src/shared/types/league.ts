export type StoryLink = {
  label: string;
  url: string;
};

export type StoryStatus = 'draft' | 'published' | 'archived';

export type StorySourceFactSnapshot = {
  ledgerId: string;
  seasonId: string;
  eventKey: string;
  eventOrder: number;
  eventLabel: string;
  matchId: string;
  contestId: string;
  playerId: string;
  playerName: string;
  format: string;
  side: string;
  outcome: string;
  ratingBefore: number;
  partnerPlayerId: string | null;
  partnerName: string | null;
  partnerRating: number | null;
  opponentOnePlayerId: string | null;
  opponentOneName: string | null;
  opponentOneRating: number | null;
  opponentTwoPlayerId: string | null;
  opponentTwoName: string | null;
  opponentTwoRating: number | null;
  ownPairRating: number | null;
  opponentPairRating: number | null;
  homeAdjustment: number;
  expectedScore: number;
  actualScore: number;
  totalDelta: number;
  calculatedAt: string;
  capturedAt: string;
};

export type Story = {
  id: string;
  slug: string;
  title: string;
  category: string;
  publishedAt: string | null;
  image: string;
  heroAssetId?: string | null;
  body: string[];
  links?: StoryLink[];
  featured?: boolean;
  status: StoryStatus;
  revision: number;
  updatedAt?: string;
  seasonId?: string | null;
  roundId?: string | null;
  matchId?: string | null;
  teamId?: string | null;
  sourceFactSnapshot?: StorySourceFactSnapshot[];
};

export type StandingEntry = {
  name: string;
  record: string;
  diff: string;
};

export type Match = {
  date: string;
  time: string;
  course: string;
  home: string;
  away: string;
};
