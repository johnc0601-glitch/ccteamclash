import type {PlayoffBracket, PlayoffGame} from '@/domain/playoffs/Playoff';
import type {PlayoffRepository} from '@/domain/playoffs/PlayoffRepository';

export class MockPlayoffRepository implements PlayoffRepository {
  private brackets: PlayoffBracket[] = [];
  private games: PlayoffGame[] = [];

  async getBracketBySeason(seasonId: string) {
    const bracket = this.brackets.find((candidate) => candidate.seasonId === seasonId);
    return bracket ? {...bracket} : undefined;
  }

  async getGames(bracketId: string) {
    return this.games.filter((game) => game.bracketId === bracketId).map((game) => ({...game}));
  }

  async saveBracket(bracket: PlayoffBracket) {
    const index = this.brackets.findIndex((candidate) => candidate.id === bracket.id);
    if (index < 0) this.brackets.push({...bracket});
    else this.brackets[index] = {...bracket};
    return {...bracket};
  }

  async saveGame(game: PlayoffGame) {
    const index = this.games.findIndex((candidate) => candidate.id === game.id);
    if (index < 0) this.games.push({...game});
    else this.games[index] = {...game};
    return {...game};
  }
}
