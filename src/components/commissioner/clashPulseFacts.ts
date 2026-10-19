export type ClashPulseStoryType =
  | 'Upset'
  | 'Match Upset'
  | 'Above Expectations'
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
  categoryFactIds?: Partial<Record<ClashPulseStoryType, string[]>>;
};

export type ClashPulseFactData = {
  scopes: ClashPulseFactScope[];
  defaultScopeId: string;
  currentSeasonHasResults: boolean;
};

export function selectDeskFacts(scope: ClashPulseFactScope, type: ClashPulseStoryType | 'Top Facts', context: ClashPulseContextFilter) {
  const ids = type === 'Top Facts' ? scope.topFactIds : scope.categoryFactIds?.[type]
    ?? scope.candidates.filter(item => item.angles[type]).map(item => item.id);
  return ids.map(id => scope.candidates.find(item => item.id === id))
    .filter((item): item is ClashPulseFactCandidate => Boolean(item))
    .filter(item => context === 'All' || (context === 'Home' || context === 'Road' ? item.venue === context : item.format === context))
    .map(candidate => ({candidate, angle: candidate.angles[type === 'Top Facts' ? candidate.primaryStoryType : type]}))
    .filter((item): item is {candidate: ClashPulseFactCandidate; angle: ClashPulseFactAngle} => Boolean(item.angle)).slice(0,10);
}
