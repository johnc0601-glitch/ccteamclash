export type IntroQueryOverride = 'play' | 'skip' | null;

type IntroDecisionInput = {
  queryOverride: IntroQueryOverride;
  hasLoginMarker: boolean;
  hasPlayedThisSession: boolean;
};

export function decideIntroPlayback({
  queryOverride,
  hasLoginMarker,
  hasPlayedThisSession,
}: IntroDecisionInput): boolean {
  if (queryOverride === 'skip') return false;
  if (queryOverride === 'play') return true;
  return hasLoginMarker && !hasPlayedThisSession;
}

export function parseIntroQuery(value: string | string[] | undefined): IntroQueryOverride {
  const normalized = Array.isArray(value) ? value[0] : value;
  if (normalized === '1') return 'play';
  if (normalized === '0') return 'skip';
  return null;
}
