export type ClashPulseStoryType =
  | 'Upset'
  | 'CI Mover'
  | 'Close Match'
  | 'Standout';

export type ClashPulseContextFilter =
  | 'All'
  | 'Singles'
  | 'Doubles'
  | 'Home'
  | 'Road';

export type ClashPulseFactCandidate = {
  id: string;
  storyType: ClashPulseStoryType;
  topics: ClashPulseStoryType[];
  headline: string;
  detail: string;
  value: string;
  badges: string[];
  pulseText: string;
  format: 'Singles' | 'Doubles';
  venue: 'Home' | 'Road';
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
