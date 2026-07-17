import {MockTeamRepository} from '@/repositories/TeamRepository';
import {TeamService} from '@/services/TeamService';

export const teamService = new TeamService(new MockTeamRepository());
