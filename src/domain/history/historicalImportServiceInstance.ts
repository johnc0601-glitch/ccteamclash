import {MockHistoricalImportRepository} from '@/domain/history/HistoricalImportRepository';
import {HistoricalImportService} from '@/domain/history/HistoricalImportService';
import {MockPlayerRepository} from '@/repositories/PlayerRepository';
import {MockTeamRepository} from '@/repositories/TeamRepository';
import {PlayerService} from '@/services/PlayerService';
import {TeamService} from '@/services/TeamService';

// Historical workbook import remains an intentionally isolated legacy workflow.
// Keep its existing mock-backed behavior contained here instead of exposing a
// shared application service container to current league features.
const teams = new TeamService(new MockTeamRepository());
const players = new PlayerService(new MockPlayerRepository(), teams);

export const historicalImportService = new HistoricalImportService(
  new MockHistoricalImportRepository(),
  teams,
  players,
);
