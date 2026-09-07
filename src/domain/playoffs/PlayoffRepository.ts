import type {PlayoffBracket, PlayoffGame} from '@/domain/playoffs/Playoff';

export interface PlayoffRepository {
  getBracketBySeason(seasonId: string): Promise<PlayoffBracket | undefined>;
  getGames(bracketId: string): Promise<PlayoffGame[]>;
  saveBracket(bracket: PlayoffBracket): Promise<PlayoffBracket>;
  saveGame(game: PlayoffGame): Promise<PlayoffGame>;
}
