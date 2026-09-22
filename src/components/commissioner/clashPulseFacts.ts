export type ClashPulseStoryType =
  | 'Upset'
  | 'Match Upset'
  | 'CI Mover'
  | 'Close Match'
  | 'Standout';

export type ClashPulseContextFilter =
  | 'All'
  | 'Singles'
  | 'Doubles'
  | 'Team'
  | 'Home'
  | 'Road';

export type ClashPulseFactAngle = {
  storyType: ClashPulseStoryType;
  headline: string;
  value: string;
  badges: string[];
  pulseText: string;
};

export type ClashPulseFactCandidate = {
  id: string;
  primaryStoryType: ClashPulseStoryType;
  topics: ClashPulseStoryType[];
  detail: string;
  format: 'Singles' | 'Doubles' | 'Team';
  venue: 'Home' | 'Road';
  angles: Partial<Record<ClashPulseStoryType, ClashPulseFactAngle>>;
};

export type ClashPulseFactScope = {
  id: string;
  label: string;
  description: string;
  candidates: ClashPulseFactCandidate[];
  topFactIds: string[];
};

export type ClashPulseFactData = {
  scopes: ClashPulseFactScope[];
  defaultScopeId: string;
  currentSeasonHasResults: boolean;
};
