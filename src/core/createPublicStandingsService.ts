import {SupabaseCourseRepository} from '@/domain/course/SupabaseCourseRepository';
import {ResultsService} from '@/domain/results/ResultsService';
import {SupabaseResultsRepository} from '@/domain/results/SupabaseResultsRepository';
import {ScheduleService} from '@/domain/schedule/ScheduleService';
import {SupabaseScheduleRepository} from '@/domain/schedule/SupabaseScheduleRepository';
import {SeasonService} from '@/domain/season/SeasonService';
import {SupabaseSeasonRepository} from '@/domain/season/SupabaseSeasonRepository';
import {createPublicClient} from '@/lib/supabase/public';
import {SupabaseScheduleTeamRepository} from '@/repositories/SupabaseScheduleTeamRepository';
import {TeamService} from '@/services/TeamService';
import {StandingsService} from '@/services/standings';

/**
 * Public-only standings service for cacheable pages.
 * Uses anonymous/public RLS and never inherits a visitor session.
 */
export function createPublicStandingsService(): StandingsService {
  const supabase = createPublicClient();
  const scheduleRepository = new SupabaseScheduleRepository(supabase);
  const seasonService = new SeasonService(new SupabaseSeasonRepository(supabase));
  const teamService = new TeamService(new SupabaseScheduleTeamRepository(supabase));
  const scheduleService = new ScheduleService(
    scheduleRepository,
    seasonService,
    teamService,
    new SupabaseCourseRepository(supabase),
  );
  const resultsService = new ResultsService(
    new SupabaseResultsRepository(supabase),
    scheduleRepository,
  );
  return new StandingsService(teamService, resultsService, scheduleService, seasonService);
}
