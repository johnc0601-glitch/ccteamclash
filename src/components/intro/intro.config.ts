export const INTRO_COOKIE_NAME = 'cc-team-clash:intro';
export const INTRO_SESSION_KEY = 'cc-team-clash:intro-played';

export const INTRO_TIMING = {
  dawnMs: 1600,
  discMs: 2000,
  blackoutMs: 600,
  logoMs: 4000,
  mottoDelayMs: 400,
  mottoFadeMs: 1000,
  homepageCrossfadeMs: 1200,
  reducedMotionHoldMs: 1200,
} as const;

export const INTRO_AUDIO_TIMING = {
  startLeadMs: 50,
  breezeFadeInMs: 800,
  breezeFadeOutMs: 1200,
  chainDecayMs: 650,
  chainStaggerMs: 12,
  bassLeadMs: 600,
  bassAttackMs: 900,
  bassReleaseMs: 2200,
  masterGain: .72,
  breezeGain: .026,
  breezeHighpassHz: 90,
  breezeLowpassHz: 720,
  chainGain: .045,
  chainFrequenciesHz: [1320, 1840, 2470, 3210],
  bassGain: .052,
  bassStartHz: 48,
  bassEndHz: 42,
} as const;

export const INTRO_ASSETS = {
  dawn: '/intro/01-dawn.webp',
  disc: '/intro/02-disc.webp',
  logo: '/branding/team-clash-logo.svg',
} as const;

export const INTRO_MOTTO = 'FUN • FELLOWSHIP • DISC GOLF';

export type IntroPhase = 'idle' | 'dawn' | 'disc' | 'blackout' | 'logo' | 'exit';
