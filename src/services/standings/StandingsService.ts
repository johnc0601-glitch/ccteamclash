import type {MatchResult} from '@/domain/results/MatchResult';
import type {ResultsService} from '@/domain/results/ResultsService';
import type {ScheduleService} from '@/domain/schedule/ScheduleService';
import type {SeasonService} from '@/domain/season/SeasonService';
import type {Team} from '@/models/Team';
import type {TeamService} from '@/services/TeamService';
import type {
  SeasonStandings,
  StandingRound,
  TeamRoundStanding,
  TeamStanding,
} from '@/services/standings/StandingsTypes';

type MutableStanding = {
  team: Team;
  gamesPlayed: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  roundResults: TeamRoundStanding[];
};

type ResolvedRegularResult = {
  matchId: string;
  roundId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
};

export class StandingsService {
  constructor(
    private readonly teams: TeamService,
    private readonly results: ResultsService,
    private readonly schedules: ScheduleService,
    private readonly seasons: SeasonService,
  ) {}

  async getActiveSeasonStandings(): Promise<SeasonStandings | undefined> {
    const season = await this.seasons.getActive();
    if (!season) return undefined;
    const [entries, rounds] = await Promise.all([
      this.getSeasonStandings(season.id),
      this.getRegularSeasonRounds(season.id),
    ]);
    return {season, entries, rounds};
  }

  async getSeasonStandings(seasonId: string): Promise<TeamStanding[]> {
    const [teams, publishedResults] = await Promise.all([
      this.teams.getAll({status: 'active'}),
      this.results.getPublishedResults(),
    ]);
    const entries = new Map<string, MutableStanding>(teams.map((team) => [
      team.id,
      {
        team,
        gamesPlayed: 0,
        wins: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        roundResults: [],
      },
    ]));

    const resolved = (await Promise.all(publishedResults.map(async (result) =>
      this.resolveRegularSeasonResult(result, seasonId))))
      .filter((result): result is ResolvedRegularResult => Boolean(result));

    for (const result of resolved) {
      const home = entries.get(result.homeTeamId);
      const away = entries.get(result.awayTeamId);
      if (!home || !away) continue;

      home.gamesPlayed += 1;
      away.gamesPlayed += 1;
      home.pointsFor += result.homeScore;
      home.pointsAgainst += result.awayScore;
      away.pointsFor += result.awayScore;
      away.pointsAgainst += result.homeScore;

      const homeOutcome = outcome(result.homeScore, result.awayScore);
      const awayOutcome = outcome(result.awayScore, result.homeScore);
      if (homeOutcome === 'W') {
        home.wins += 1;
        away.losses += 1;
      } else if (awayOutcome === 'W') {
        away.wins += 1;
        home.losses += 1;
      }

      const pointsAvailable = result.homeScore + result.awayScore;
      home.roundResults.push({
        roundId: result.roundId,
        matchId: result.matchId,
        outcome: homeOutcome,
        pointsFor: result.homeScore,
        pointsAvailable,
      });
      away.roundResults.push({
        roundId: result.roundId,
        matchId: result.matchId,
        outcome: awayOutcome,
        pointsFor: result.awayScore,
        pointsAvailable,
      });
    }

    const calculated = [...entries.values()].map((entry): TeamStanding => {
      const pointsAvailable = entry.pointsFor + entry.pointsAgainst;
      return {
        ...entry,
        rank: 0,
        pointsAvailable,
        pointsPercentage: pointsAvailable ? entry.pointsFor / pointsAvailable : 0,
        pointDifferential: entry.pointsFor - entry.pointsAgainst,
        winningPercentage: entry.gamesPlayed ? entry.wins / entry.gamesPlayed : 0,
        roundResults: [...entry.roundResults].sort((left, right) =>
          left.roundId.localeCompare(right.roundId)),
      };
    });

    return rankStandings(calculated, resolved);
  }

  async getTeamStanding(teamId: string, seasonId: string): Promise<TeamStanding | undefined> {
    return (await this.getSeasonStandings(seasonId))
      .find((entry) => entry.team.id === teamId);
  }

  private async resolveRegularSeasonResult(
    result: MatchResult,
    seasonId: string,
  ): Promise<ResolvedRegularResult | undefined> {
    const match = await this.schedules.getMatch(result.matchId);
    if (!match || match.seasonId !== seasonId
      || !match.homeTeamId || !match.awayTeamId
      || result.homeScore === null || result.awayScore === null) return undefined;

    const round = await this.schedules.getRound(match.roundId);
    if (round && isPlayoffRoundName(round.name)) return undefined;

    return {
      matchId: result.matchId,
      roundId: match.roundId,
      homeTeamId: match.homeTeamId,
      awayTeamId: match.awayTeamId,
      homeScore: result.homeScore,
      awayScore: result.awayScore,
    };
  }

  private async getRegularSeasonRounds(seasonId: string): Promise<StandingRound[]> {
    const schedules = await this.schedules.getSchedules({seasonId});
    const schedule = schedules.find((entry) => entry.seasonId === seasonId && entry.published)
      ?? schedules.find((entry) => entry.seasonId === seasonId);
    if (!schedule) return [];

    return (await this.schedules.getRounds(schedule.id))
      .filter((round) => round.seasonId === seasonId && !isPlayoffRoundName(round.name))
      .sort((left, right) => left.number - right.number)
      .map((round) => ({
        id: round.id,
        number: round.number,
        name: round.name,
        date: round.date,
      }));
  }
}

function outcome(pointsFor: number, pointsAgainst: number): 'W' | 'L' | 'T' {
  if (pointsFor > pointsAgainst) return 'W';
  if (pointsFor < pointsAgainst) return 'L';
  return 'T';
}

function rankStandings(
  entries: TeamStanding[],
  results: ResolvedRegularResult[],
): TeamStanding[] {
  const groups = new Map<number, TeamStanding[]>();
  for (const entry of entries) {
    const group = groups.get(entry.winningPercentage) ?? [];
    group.push(entry);
    groups.set(entry.winningPercentage, group);
  }

  const ranked = [...groups.keys()]
    .sort((left, right) => right - left)
    .flatMap((percentage) => resolveHeadToHead(groups.get(percentage) ?? [], results));

  return ranked.map((entry, index) => ({...entry, rank: index + 1}));
}

function resolveHeadToHead(
  entries: TeamStanding[],
  results: ResolvedRegularResult[],
): TeamStanding[] {
  if (entries.length < 2) return entries;

  const tiedTeamIds = new Set(entries.map((entry) => entry.team.id));
  const pairRecords = new Map<string, {firstWins: number; secondWins: number}>();

  for (const result of results) {
    if (!tiedTeamIds.has(result.homeTeamId) || !tiedTeamIds.has(result.awayTeamId)) continue;
    if (result.homeScore === result.awayScore) continue;

    const [first] = [result.homeTeamId, result.awayTeamId].sort();
    const key = [result.homeTeamId, result.awayTeamId].sort().join('::');
    const record = pairRecords.get(key) ?? {firstWins: 0, secondWins: 0};
    const winner = result.homeScore > result.awayScore ? result.homeTeamId : result.awayTeamId;
    if (winner === first) record.firstWins += 1;
    else record.secondWins += 1;
    pairRecords.set(key, record);
  }

  const headToHeadWinner = (firstId: string, secondId: string): string | undefined => {
    const [first, second] = [firstId, secondId].sort();
    const record = pairRecords.get(`${first}::${second}`);
    if (!record || record.firstWins === record.secondWins) return undefined;
    return record.firstWins > record.secondWins ? first : second;
  };

  const resolveRemaining = (tied: TeamStanding[]): TeamStanding[] => {
    if (tied.length < 2) return tied;

    // A team that beats every other tied team wins the highest available spot.
    const outrightWinner = tied.find((entry) => tied.every((opponent) =>
      opponent.team.id === entry.team.id
      || headToHeadWinner(entry.team.id, opponent.team.id) === entry.team.id));
    if (outrightWinner) {
      return [
        outrightWinner,
        ...resolveRemaining(tied.filter((entry) => entry !== outrightWinner)),
      ];
    }

    // A team that loses to every other tied team takes the lowest available spot.
    const outrightLoser = tied.find((entry) => tied.every((opponent) =>
      opponent.team.id === entry.team.id
      || headToHeadWinner(entry.team.id, opponent.team.id) === opponent.team.id));
    if (outrightLoser) {
      return [
        ...resolveRemaining(tied.filter((entry) => entry !== outrightLoser)),
        outrightLoser,
      ];
    }

    // Incomplete / circular H2H is not transitive: A > B and B > C
    // cannot rank A against C without an A-C result.
    // Award the highest remaining spot by unrounded points percentage,
    // then restart H2H for the remaining teams.
    const [leader] = [...tied].sort(comparePointsPercentage);
    return [leader, ...resolveRemaining(tied.filter((entry) => entry !== leader))];
  };

  return resolveRemaining(entries);
}

function comparePointsPercentage(left: TeamStanding, right: TeamStanding): number {
  // Exact points-percent ties require the charter's commissioner-run playoff.
  // Name/ID are display-order fallbacks only, not official tiebreakers.
  return right.pointsPercentage - left.pointsPercentage
    || left.team.name.localeCompare(right.team.name, undefined, {sensitivity: 'base'})
    || left.team.id.localeCompare(right.team.id);
}

function isPlayoffRoundName(value: string): boolean {
  const name = value.trim().toLocaleLowerCase();
  return name === 'semifinal'
    || name === 'semifinals'
    || name === 'championship'
    || name === 'final'
    || name === 'finals'
    || name === 'third place'
    || name === '3rd place';
}
