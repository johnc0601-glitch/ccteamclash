export type ClashPulseFactCategory =
  | 'Upsets'
  | 'CI Gaps'
  | 'Above Expected'
  | 'Road'
  | 'Home'
  | 'Singles'
  | 'Doubles'
  | 'CI +/-'
  | 'Closest';

export type ClashPulseFactCandidate = {
  id: string;
  category: ClashPulseFactCategory;
  headline: string;
  detail: string;
  value: string;
  pulseText: string;
};

export type ClashPulseFactScope = {
  id: string;
  label: string;
  description: string;
  candidates: ClashPulseFactCandidate[];
};

export type ClashPulseFactData = {
  scopes: ClashPulseFactScope[];
  defaultScopeId: string;
  currentSeasonHasResults: boolean;
};
