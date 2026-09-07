import {MockHistoricalImportRepository} from '@/domain/history/HistoricalImportRepository';
import {HistoricalImportService} from '@/domain/history/HistoricalImportService';
import {MockPlayerRepository} from '@/repositories/PlayerRepository';
import {MockTeamRepository} from '@/repositories/TeamRepository';
import {PlayerService} from '@/services/PlayerService';
import {TeamService} from '@/services/TeamService';

// Isolated legacy fixture for the historical workbook preview/apply screen.
// Current league features must use explicit Supabase-backed server services.
const teams = new TeamService(new MockTeamRepository());
const players = new PlayerService(new MockPlayerRepository(), teams);

export const historicalImportService = new HistoricalImportService(
  new MockHistoricalImportRepository(),
  teams,
  players,
);
