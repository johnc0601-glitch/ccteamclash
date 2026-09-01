export type StoryTriggerType =
  | 'WIN_STREAK'
  | 'STREAK_SNAPPED'
  | 'UPSET'
  | 'CI_SURGE'
  | 'RANK_MILESTONE'
  | 'CAREER_MILESTONE'
  | 'PERSONAL_BEST'
  | 'FIRST_SINCE'
  | 'HEAD_TO_HEAD'
  | 'TEAM_SERIES'
  | 'DOUBLES_CHEMISTRY'
  | 'RECORD';

export type StoryFactValue = string | number | boolean | null;
export type VerifiedStoryFacts = Readonly<Record<string, StoryFactValue>>;

export type StoryScoreComponents = {
  magnitude: number;
  rarity: number;
  historicalSignificance: number;
  recency: number;
  standingsSignificance: number;
  opponentQuality: number;
};

/**
 * A StoryCandidate explains why one or more authoritative contest facts are
 * editorially interesting. It never changes ratings, results, standings, or
 * any other league source of truth.
 */
export type StoryCandidate = {
  id: string;
  triggerType: StoryTriggerType;
  seasonId: string;
  eventId?: string;
  matchId?: string;
  playerIds: string[];
  teamIds: string[];
  headlineFacts: VerifiedStoryFacts;
  contextFacts: VerifiedStoryFacts;
  scores: StoryScoreComponents;
  storyScore: number;
  confidence: 'verified';
};

export type StoryCandidateDraft = Omit<StoryCandidate, 'storyScore' | 'confidence'>;
