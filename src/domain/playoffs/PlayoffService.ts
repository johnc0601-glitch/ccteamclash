import type {
  GeneratePlayoffInput,
  PlayoffBracket,
  PlayoffBracketView,
  PlayoffGame,
  PlayoffGameView,
  PlayoffResult,
} from '@/domain/playoffs/Playoff';
import type {PlayoffRepository} from '@/domain/playoffs/PlayoffRepository';
import type {ResultsService} from '@/domain/results/ResultsService';
import type {Match} from '@/domain/schedule/Match';
import type {ScheduleService} from '@/domain/schedule/ScheduleService';
import type {TeamService} from '@/services/TeamService';
import type {StandingsService} from '@/services/standings';

export class PlayoffService {
  constructor(
    private readonly repository: PlayoffRepository,
    private readonly standings: StandingsService,
    private readonly schedules: ScheduleService,
    private readonly results: ResultsService,
    private readonly teams: TeamService,
  ) {}

  async getBracket(seasonId: string, publishedOnly = false): Promise<PlayoffBracketView | undefined> {
    let bracket = await this.repository.getBracketBySeason(seasonId);
    if (!bracket || (publishedOnly && bracket.status !== 'Published')) return undefined;
    if (!publishedOnly) bracket = await this.syncAdvancement(bracket);
    const games = await this.repository.getGames(bracket.id);
    const [allTeams, gameViews] = await Promise.all([
      this.teams.getAll(),
      Promise.all(games.map((game) => this.toGameView(game))),
    ]);
    return {
      bracket,
      games: gameViews.sort((left, right) =>
        stageOrder(left.stage) - stageOrder(right.stage) || left.position - right.position),
      champion: bracket.championTeamId
        ? allTeams.find((team) => team.id === bracket.championTeamId)
        : undefined,
    };
  }

  async generate(input: GeneratePlayoffInput): Promise<PlayoffResult<PlayoffBracketView>> {
    if (await this.repository.getBracketBySeason(input.seasonId)) {
      return {ok: false, message: 'A playoff bracket already exists for this season.'};
    }
    const matchIds = [input.semifinal1MatchId, input.semifinal2MatchId, input.championshipMatchId];
    if (new Set(matchIds).size !== 3) return {ok: false, message: 'Select three different playoff matches.'};
    const matches = await Promise.all(matchIds.map((id) => this.schedules.getMatch(id)));
    if (matches.some((match) => !match || match.seasonId !== input.seasonId)) {
      return {ok: false, message: 'All playoff matches must exist in the selected season.'};
    }
    if ((await Promise.all(matchIds.map((id) => this.results.getResult(id)))).some(Boolean)) {
      return {ok: false, message: 'A selected playoff match already has result data.'};
    }
    const standings = await this.standings.getSeasonStandings(input.seasonId);
    const seeds = standings.slice(0, 4);
    if (seeds.length < 4 || seeds.some((entry) => entry.gamesPlayed === 0)) {
      return {ok: false, message: 'Four teams with completed regular-season games are required.'};
    }
    const publishedSchedules = await this.schedules.getSchedules({
      seasonId: input.seasonId,
      publication: 'published',
    });
    const rounds = (await Promise.all(
      publishedSchedules.map((schedule) => this.schedules.getRounds(schedule.id)),
    )).flat();
    const regularMatches = (await Promise.all(
      rounds.map((round) => this.schedules.getMatches(round.id)),
    )).flat().filter((match) => !matchIds.includes(match.id));
    if (!regularMatches.length) return {ok: false, message: 'No published regular-season matches were found.'};
    const regularResults = await Promise.all(
      regularMatches.map((match) => this.results.getPublishedResult(match.id)),
    );
    if (regularResults.some((result) => !result)) {
      return {ok: false, message: 'Publish every regular-season result before generating playoffs.'};
    }

    const assigned = await Promise.all([
      this.schedules.assignPlayoffTeams(matchIds[0], seeds[0].team.id, seeds[3].team.id),
      this.schedules.assignPlayoffTeams(matchIds[1], seeds[1].team.id, seeds[2].team.id),
      this.schedules.assignPlayoffTeams(matchIds[2], null, null),
    ]);
    const failedAssignment = assigned.find((result) => !result.ok);
    if (failedAssignment && !failedAssignment.ok) return failedAssignment;

    const now = new Date().toISOString();
    const bracket: PlayoffBracket = {
      id: `playoffs-${input.seasonId}`,
      seasonId: input.seasonId,
      status: 'Draft',
      regularSeasonLockedAt: now,
      publishedAt: null,
      championTeamId: null,
      createdAt: now,
      updatedAt: now,
    };
    await this.repository.saveBracket(bracket);
    const games: PlayoffGame[] = [
      game(bracket.id, 'sf1', 'Semifinal', 1, matchIds[0], 1, 4, now),
      game(bracket.id, 'sf2', 'Semifinal', 2, matchIds[1], 2, 3, now),
      game(bracket.id, 'final', 'Championship', 1, matchIds[2], null, null, now),
    ];
    await Promise.all(games.map((entry) => this.repository.saveGame(entry)));
    const view = await this.getBracket(input.seasonId);
    return view ? {ok: true, data: view} : {ok: false, message: 'Bracket could not be loaded.'};
  }

  async publish(seasonId: string): Promise<PlayoffResult<PlayoffBracketView>> {
    const bracket = await this.repository.getBracketBySeason(seasonId);
    if (!bracket) return {ok: false, message: 'Generate the bracket before publishing.'};
    if (bracket.status === 'Published') return {ok: false, message: 'The bracket is already published.'};
    const now = new Date().toISOString();
    await this.repository.saveBracket({...bracket, status: 'Published', publishedAt: now, updatedAt: now});
    const view = await this.getBracket(seasonId);
    return view ? {ok: true, data: view} : {ok: false, message: 'Bracket could not be loaded.'};
  }

  private async syncAdvancement(bracket: PlayoffBracket): Promise<PlayoffBracket> {
    const games = await this.repository.getGames(bracket.id);
    if (games.length !== 3) return bracket;
    const sf1 = games.find((game) => game.stage === 'Semifinal' && game.position === 1);
    const sf2 = games.find((game) => game.stage === 'Semifinal' && game.position === 2);
    const final = games.find((game) => game.stage === 'Championship');
    if (!sf1 || !sf2 || !final) return bracket;
    const [sf1View, sf2View, finalMatch] = await Promise.all([
      this.toGameView(sf1),
      this.toGameView(sf2),
      this.schedules.getMatch(final.matchId),
    ]);
    if (!finalMatch) return bracket;
    const finalists = [sf1View.winnerTeamId, sf2View.winnerTeamId];
    if (!finalists[0] || !finalists[1]) {
      const downstream = await this.results.getPublishedResult(final.matchId);
      if (downstream) await this.results.reopen(final.matchId);
      if (finalMatch.homeTeamId || finalMatch.awayTeamId) {
        await this.schedules.assignPlayoffTeams(final.matchId, null, null);
      }
      return this.saveChampion(bracket, null);
    }
    if (finalMatch.homeTeamId !== finalists[0] || finalMatch.awayTeamId !== finalists[1]) {
      await this.schedules.assignPlayoffTeams(final.matchId, finalists[0], finalists[1]);
    }
    const currentFinal = await this.schedules.getMatch(final.matchId);
    const finalResult = await this.results.getPublishedResult(final.matchId);
    const champion = currentFinal && finalResult
      ? winner(currentFinal, finalResult.homeScore, finalResult.awayScore)
      : undefined;
    return this.saveChampion(bracket, champion);
  }

  private async saveChampion(bracket: PlayoffBracket, championTeamId: string | null | undefined) {
    const champion = championTeamId ?? null;
    if (bracket.championTeamId === champion) return bracket;
    return this.repository.saveBracket({
      ...bracket,
      championTeamId: champion,
      updatedAt: new Date().toISOString(),
    });
  }

  private async toGameView(game: PlayoffGame): Promise<PlayoffGameView> {
    const match = await this.schedules.getMatch(game.matchId);
    if (!match) throw new Error(`Playoff match ${game.matchId} was not found.`);
    const [result, teams] = await Promise.all([
      this.results.getPublishedResult(game.matchId),
      this.teams.getAll(),
    ]);
    return {
      ...game,
      match,
      result,
      homeTeam: match.homeTeamId ? teams.find((team) => team.id === match.homeTeamId) : undefined,
      awayTeam: match.awayTeamId ? teams.find((team) => team.id === match.awayTeamId) : undefined,
      winnerTeamId: result ? winner(match, result.homeScore, result.awayScore) : undefined,
    };
  }
}

function winner(match: Match, homeScore: number | null, awayScore: number | null) {
  if (homeScore === null || awayScore === null || homeScore === awayScore) return undefined;
  return homeScore > awayScore ? match.homeTeamId ?? undefined : match.awayTeamId ?? undefined;
}
function game(bracketId: string, suffix: string, stage: PlayoffGame['stage'], position: 1 | 2, matchId: string, homeSeed: number | null, awaySeed: number | null, now: string): PlayoffGame {
  return {id: `${bracketId}-${suffix}`, bracketId, stage, position, matchId, homeSeed, awaySeed, createdAt: now, updatedAt: now};
}
function stageOrder(stage: PlayoffGame['stage']) {
  return stage === 'Semifinal' ? 0 : 1;
}
