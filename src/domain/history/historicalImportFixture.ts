import {MockHistoricalImportRepository} from '@/domain/history/HistoricalImportRepository';
import {HistoricalImportService} from '@/domain/history/HistoricalImportService';
import {PlayerService} from '@/services/PlayerService';
import {TeamService} from '@/services/TeamService';
import {MockPlayerRepository} from '@/test-fixtures/MockPlayerRepository';
import {MockTeamRepository} from '@/test-fixtures/MockTeamRepository';

// Isolated legacy fixture for the historical workbook preview/apply screen.
// Current league features must use explicit Supabase-backed server services.
const teams = new TeamService(new MockTeamRepository());
const players = new PlayerService(new MockPlayerRepository(), teams);

export const historicalImportService = new HistoricalImportService(
  new MockHistoricalImportRepository(),
  teams,
  players,
);
