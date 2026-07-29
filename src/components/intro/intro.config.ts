export const INTRO_COOKIE_NAME = 'cc-team-clash:intro';
export const INTRO_SESSION_KEY = 'cc-team-clash:intro-played';

export const INTRO_TIMING = {
  dawnMs: 800,
  discMs: 1000,
  blackoutMs: 300,
  logoMs: 1000,
  mottoDelayMs: 200,
  mottoFadeMs: 500,
  homepageCrossfadeMs: 600,
  reducedMotionHoldMs: 600,
} as const;

export const INTRO_ASSETS = {
  dawn: '/intro/01-dawn.webp',
  disc: '/intro/02-disc.webp',
  logo: '/branding/team-clash-logo.svg',
} as const;

export const INTRO_MOTTO = 'FUN • FELLOWSHIP • DISC GOLF';

export type IntroPhase = 'idle' | 'dawn' | 'disc' | 'blackout' | 'logo' | 'exit';
