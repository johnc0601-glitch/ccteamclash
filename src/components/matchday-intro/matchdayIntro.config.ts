export type MatchdayIntroArt = {
  matchId: string;
  label: string;
  desktop: string;
  mobile?: string;
};

const root = '/matchday-intros/2026-2027/round-1';

export const MATCHDAY_WELCOME_ART = {
  desktop: '/matchday-intros/welcome/welcome-desktop-hq.webp',
  mobile: '/matchday-intros/welcome/welcome-mobile-hq.webp',
} as const;

// Verified against live launch_schedule_matches on 2026-09-27.
// IDs retain legacy team names: use public slugs, not names inferred from IDs.
export const MATCHDAY_INTROS: Record<string, MatchdayIntroArt> = {
  'kb-at-dark-knights-2026-r1': {
    matchId: 'ninjas-vs-kb-cccdd6ca-c5ce-4ecb-b7c9-c02d7d657e9f',
    label: 'KB at Dark Knights',
    desktop: `${root}/01_KB_at_Dark_Knights.webp`,
    mobile: `${root}/01_KB_at_Dark_Knights.mobile.webp`,
  },
  'wild-turkey-at-cougar-country-2026-r1': {
    matchId: 'wild-turkey-vs-team-focus-7fafa1dc-4ee3-4e7f-85dc-4b5f866275f2',
    label: 'Wild Turkey at Cougar Country',
    desktop: `${root}/02_Wild_Turkey_at_Cougar_Country.webp`,
  },
  'hayneous-og-s-at-ninjas-2026-r1': {
    matchId: 'hayneous-og-s-vs-dark-knights-c1b325a9-473a-4bed-a85c-0dec6766a766',
    label: "Hayneous OG's at Ninjas",
    desktop: `${root}/03_Hayneous_OGs_at_Ninjas.webp`,
  },
  'beast-mode-at-riptide-2026-r1': {
    matchId: 'beast-mode-vs-riptide-3ed22cf9-623e-4c11-96a2-b0e6c42b7e0d',
    label: 'Beast Mode at Riptide',
    desktop: `${root}/04_Beast_Mode_at_Riptide.webp`,
  },
};

export const MATCHDAY_INTRO_TIMING = {
  revealMs: 2400,
  durationMs: 5700,
  reducedMs: 700,
} as const;

export function findMatchdayIntro(href: string) {
  const reference = /^\/matches\/([^/?#]+)\/?$/.exec(href)?.[1];
  if (!reference) return undefined;
  let decoded: string;
  try { decoded = decodeURIComponent(reference); } catch { return undefined; }
  const entry = Object.entries(MATCHDAY_INTROS).find(([slug, art]) => slug === decoded || art.matchId === decoded);
  return entry ? {slug: entry[0], art: entry[1]} : undefined;
}

export function selectIntroImage(art: MatchdayIntroArt, mobile: boolean) {
  return mobile && art.mobile ? art.mobile : art.desktop;
}

