export type HistoricalClashMatch = {
  awayTeam: string;
  homeTeam: string;
};

export const HISTORICAL_RATED_EVENTS: Record<string, Record<string, HistoricalClashMatch[]>> = {
  'coastal-clash-2024-2025': {
    November: [
      {awayTeam: 'Dark Knights', homeTeam: 'Wild Turkey'},
      {awayTeam: 'KB', homeTeam: 'Cougar Country'},
      {awayTeam: 'Beast Mode', homeTeam: "Hayneous OG's"},
    ],
    December: [
      {awayTeam: "Hayneous OG's", homeTeam: 'KB'},
      {awayTeam: 'Cougar Country', homeTeam: 'Dark Knights'},
      {awayTeam: 'Wild Turkey', homeTeam: 'Beast Mode'},
    ],
    January: [
      {awayTeam: 'Wild Turkey', homeTeam: "Hayneous OG's"},
      {awayTeam: 'Dark Knights', homeTeam: 'KB'},
      {awayTeam: 'Beast Mode', homeTeam: 'Cougar Country'},
    ],
    February: [
      {awayTeam: "Hayneous OG's", homeTeam: 'Dark Knights'},
      {awayTeam: 'KB', homeTeam: 'Beast Mode'},
      {awayTeam: 'Cougar Country', homeTeam: 'Wild Turkey'},
    ],
    March: [
      {awayTeam: 'Wild Turkey', homeTeam: 'KB'},
      {awayTeam: "Hayneous OG's", homeTeam: 'Cougar Country'},
      {awayTeam: 'Beast Mode', homeTeam: 'Dark Knights'},
    ],
  },
  'coastal-clash-2025-2026': {
    October: [
      {awayTeam: 'Dark Knights', homeTeam: 'KB'},
      {awayTeam: 'Riptide', homeTeam: 'Cougar Country'},
      {awayTeam: 'Wild Turkey', homeTeam: 'Beast Mode'},
      {awayTeam: 'Ninjas', homeTeam: "Hayneous OG's"},
    ],
    November: [
      {awayTeam: 'KB', homeTeam: 'Wild Turkey'},
      {awayTeam: 'Beast Mode', homeTeam: "Hayneous OG's"},
      {awayTeam: 'Cougar Country', homeTeam: 'Ninjas'},
      {awayTeam: 'Dark Knights', homeTeam: 'Riptide'},
    ],
    December: [
      {awayTeam: 'Cougar Country', homeTeam: 'Dark Knights'},
      {awayTeam: 'Riptide', homeTeam: 'Beast Mode'},
      {awayTeam: "Hayneous OG's", homeTeam: 'Wild Turkey'},
      {awayTeam: 'KB', homeTeam: 'Ninjas'},
    ],
    January: [
      {awayTeam: "Hayneous OG's", homeTeam: 'Cougar Country'},
      {awayTeam: 'Beast Mode', homeTeam: 'KB'},
      {awayTeam: 'Ninjas', homeTeam: 'Riptide'},
      {awayTeam: 'Wild Turkey', homeTeam: 'Dark Knights'},
    ],
    February: [
      {awayTeam: 'Dark Knights', homeTeam: 'Ninjas'},
      {awayTeam: 'KB', homeTeam: "Hayneous OG's"},
      {awayTeam: 'Cougar Country', homeTeam: 'Beast Mode'},
      {awayTeam: 'Riptide', homeTeam: 'Wild Turkey'},
    ],
  },
};

export function historicalSide(
  seasonId: string,
  eventLabel: string,
  playerTeamName: string,
  opponentTeamName: string,
): 'Home' | 'Away' {
  const matches = HISTORICAL_RATED_EVENTS[seasonId]?.[eventLabel];
  if (!matches) throw new Error(`No rated historical event map for ${seasonId} ${eventLabel}.`);

  const playerTeam = normalizeHistoricalTeam(playerTeamName);
  const opponentTeam = normalizeHistoricalTeam(opponentTeamName);
  const match = matches.find((candidate) => {
    const home = normalizeHistoricalTeam(candidate.homeTeam);
    const away = normalizeHistoricalTeam(candidate.awayTeam);
    return (home === playerTeam && away === opponentTeam)
      || (home === opponentTeam && away === playerTeam);
  });
  if (!match) {
    throw new Error(`No historical matchup map for ${playerTeamName} vs ${opponentTeamName} in ${seasonId} ${eventLabel}.`);
  }
  return normalizeHistoricalTeam(match.homeTeam) === playerTeam ? 'Home' : 'Away';
}

export function isHistoricalRatedEvent(seasonId: string, eventLabel: string): boolean {
  return Boolean(HISTORICAL_RATED_EVENTS[seasonId]?.[eventLabel]);
}

function normalizeHistoricalTeam(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[’]/g, "'");
  if (normalized === "hayneous og's" || normalized === "haynous og's" || normalized === 'ogs' || normalized === "og's") {
    return "hayneous og's";
  }
  if (normalized === 'riptide') return 'riptide';
  return normalized;
}
