export const INTRO_COOKIE_NAME = 'cc-team-clash:intro';
export const INTRO_SESSION_KEY = 'cc-team-clash:intro-played';

export const INTRO_TIMING = {
  dawnMs: 1600,
  discMs: 2000,
  blackoutMs: 600,
  logoMs: 6000,
  mottoDelayMs: 400,
  mottoFadeMs: 1000,
  homepageCrossfadeMs: 1200,
  reducedMotionHoldMs: 1200,
} as const;

export const INTRO_ASSETS = {
  dawn: '/intro/01-dawn.webp',
  disc: '/intro/02-disc.webp',
  logo: '/branding/team-clash-logo.svg',
} as const;

export const INTRO_MOTTO = 'FUN • FELLOWSHIP • DISC GOLF';

export type IntroPhase = 'idle' | 'dawn' | 'disc' | 'blackout' | 'logo' | 'exit';
