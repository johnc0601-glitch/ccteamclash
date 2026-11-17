/** Completed team-match results for interpreting Clash Challenge spreads. */
export type CompletedClashMatch = {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  seasonName: string;
};

export type ClashVenueStats = {
  played: number;
  wins: number;
  losses: number;
  ties: number;
  winPercentage: number | null;
  averageVictoryMargin: number | null;
  averageDefeatMargin: number | null;
};

export type ClashChallengeInsights = {
  home: ClashVenueStats;
  away: ClashVenueStats;
  previousMeeting: CompletedClashMatch | null;
};

/** Match names in the historical archive to the current team IDs. */
export function historicalClashTeamId(name: string): string {
  const normalized = name.trim().toLowerCase().replace(/[’']/g, '').replace(/\s+/g, '-');
  if (normalized === 'hayneous-ogs') return 'hayneous-og-s';
  return normalized;
}

function oneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function average(values: number[]): number | null {
  return values.length ? oneDecimal(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

function summarizeVenue(games: CompletedClashMatch[], teamId: string, venue: 'home' | 'away'): ClashVenueStats {
  const margins = games.filter(game => (venue === 'home' ? game.homeTeamId : game.awayTeamId) === teamId)
    .map(game => venue === 'home' ? game.homeScore - game.awayScore : game.awayScore - game.homeScore);
  const wins = margins.filter(margin => margin > 0);
  const losses = margins.filter(margin => margin < 0);
  return {
    played: margins.length,
    wins: wins.length,
    losses: losses.length,
    ties: margins.length - wins.length - losses.length,
    winPercentage: margins.length ? oneDecimal(wins.length * 100 / margins.length) : null,
    averageVictoryMargin: average(wins),
    averageDefeatMargin: average(losses.map(Math.abs)),
  };
}

/**
 * Historical games must be passed before published current-season games,
 * and each set should be chronological so the last matching game is the latest.
 * Averages of victories and defeats are deliberately kept separate.
 */
export function buildClashChallengeInsights(
  games: CompletedClashMatch[], homeTeamId: string, awayTeamId: string,
): ClashChallengeInsights {
  const previousMeeting = games.filter(game =>
    (game.homeTeamId === homeTeamId && game.awayTeamId === awayTeamId)
    || (game.homeTeamId === awayTeamId && game.awayTeamId === homeTeamId)
  ).at(-1) ?? null;
  return {
    home: summarizeVenue(games, homeTeamId, 'home'),
    away: summarizeVenue(games, awayTeamId, 'away'),
    previousMeeting,
  };
}
