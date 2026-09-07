import {MockHistoricalImportRepository} from '@/domain/history/HistoricalImportRepository';
import {HistoricalImportService} from '@/domain/history/HistoricalImportService';
import {MockPlayerRepository} from '@/repositories/PlayerRepository';
import {MockTeamRepository} from '@/repositories/TeamRepository';
import {PlayerService} from '@/services/PlayerService';
import {TeamService} from '@/services/TeamService';

// Legacy boundary: only the historical workbook importer still depends on the
// mock-backed pre-launch service graph. Current league features must use their
// explicit Supabase/server services instead of this container.
const teams = new TeamService(new MockTeamRepository());
const players = new PlayerService(new MockPlayerRepository(), teams);

export const services = {
  historicalImports: new HistoricalImportService(
    new MockHistoricalImportRepository(),
    teams,
    players,
  ),
};
