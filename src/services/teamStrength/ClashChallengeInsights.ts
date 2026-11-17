/** Completed published matches used as context for Clash Challenge picks. */
export type CompletedClashMatch = {
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number;
  awayScore: number;
  seasonName: string;
  eventLabel?: string;
  playedOn?: string;
  /** Shortened playoff matches count for head-to-head, not standard match margins. */
  isFullLength: boolean;
  isCurrentSeason: boolean;
};

export type ClashVenueStats = {
  played: number;
  wins: number;
  losses: number;
  ties: number;
  averageVictoryMargin: number | null;
  averageDefeatMargin: number | null;
};

export type ClashSeasonResult = {
  opponent: string;
  venue: 'home' | 'away';
  result: 'W' | 'L' | 'T';
  scoreFor: number;
  scoreAgainst: number;
  playedOn?: string;
};

export type ClashSeasonForm = {
  wins: number;
  losses: number;
  ties: number;
  results: ClashSeasonResult[];
};

export type ClashChallengeInsights = {
  home: ClashVenueStats;
  away: ClashVenueStats;
  homeSeason: ClashSeasonForm;
  awaySeason: ClashSeasonForm;
  previousMeeting: CompletedClashMatch | null;
};

/** The archive uses team display names rather than the site's stable team IDs. */
export function historicalClashTeamId(name: string): string {
  const normalized = name.trim().toLowerCase().replace(/[’']/g, '').replace(/\s+/g, '-');
  return normalized === 'hayneous-ogs' ? 'hayneous-og-s' : normalized;
}

export function isFullLengthClashMatch(eventLabel: string | null | undefined): boolean {
  return !/semifinal|championship|3rd place|playoff/i.test(eventLabel ?? '');
}

function oneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

function average(values: number[]): number | null {
  return values.length ? oneDecimal(values.reduce((sum, value) => sum + value, 0) / values.length) : null;
}

function summarizeVenue(games: CompletedClashMatch[], teamId: string, venue: 'home' | 'away'): ClashVenueStats {
  const margins = games
    .filter(game => game.isFullLength && (venue === 'home' ? game.homeTeamId : game.awayTeamId) === teamId)
    .map(game => venue === 'home' ? game.homeScore - game.awayScore : game.awayScore - game.homeScore);
  const wins = margins.filter(margin => margin > 0);
  const losses = margins.filter(margin => margin < 0);
  return {
    played: margins.length,
    wins: wins.length,
    losses: losses.length,
    ties: margins.length - wins.length - losses.length,
    averageVictoryMargin: average(wins),
    averageDefeatMargin: average(losses.map(Math.abs)),
  };
}

function summarizeSeason(games: CompletedClashMatch[], teamId: string): ClashSeasonForm {
  // Current-season games are supplied in chronological order by the published-results loader.
  const results: ClashSeasonResult[] = games
    .filter(game => game.isCurrentSeason && (game.homeTeamId === teamId || game.awayTeamId === teamId))
    .map(game => {
      const home = game.homeTeamId === teamId;
      const scoreFor = home ? game.homeScore : game.awayScore;
      const scoreAgainst = home ? game.awayScore : game.homeScore;
      return {
        opponent: home ? game.awayTeamName : game.homeTeamName,
        venue: home ? 'home' as const : 'away' as const,
        result: scoreFor > scoreAgainst ? 'W' as const : scoreFor < scoreAgainst ? 'L' as const : 'T' as const,
        scoreFor,
        scoreAgainst,
        playedOn: game.playedOn,
      };
    });
  return {
    wins: results.filter(result => result.result === 'W').length,
    losses: results.filter(result => result.result === 'L').length,
    ties: results.filter(result => result.result === 'T').length,
    results,
  };
}

/** Calculate once for each featured match without changing fixed projections or votes. */
export function buildClashChallengeInsights(
  games: CompletedClashMatch[], homeTeamId: string, awayTeamId: string,
): ClashChallengeInsights {
  // Archive, then published current-season results, are loaded in chronological order.
  const previousMeeting = games.filter(game =>
    (game.homeTeamId === homeTeamId && game.awayTeamId === awayTeamId)
    || (game.homeTeamId === awayTeamId && game.awayTeamId === homeTeamId)
  ).at(-1) ?? null;
  return {
    home: summarizeVenue(games, homeTeamId, 'home'),
    away: summarizeVenue(games, awayTeamId, 'away'),
    homeSeason: summarizeSeason(games, homeTeamId),
    awaySeason: summarizeSeason(games, awayTeamId),
    previousMeeting,
  };
}
