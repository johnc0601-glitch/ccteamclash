import {SupabaseCourseRepository} from '@/domain/course/SupabaseCourseRepository';
import {CanonicalScheduleService} from '@/domain/schedule/CanonicalScheduleService';
import {SupabaseScheduleRepository} from '@/domain/schedule/SupabaseScheduleRepository';
import {SeasonService} from '@/domain/season/SeasonService';
import {SupabaseSeasonRepository} from '@/domain/season/SupabaseSeasonRepository';
import {createPublicClient} from '@/lib/supabase/public';
import {SupabaseScheduleTeamRepository} from '@/repositories/SupabaseScheduleTeamRepository';
import {TeamService} from '@/services/TeamService';

/**
 * Public-only schedule service for cacheable pages.
 * Uses the publishable/anon role with no visitor cookies attached.
 */
export function createPublicScheduleService(): CanonicalScheduleService {
  const supabase = createPublicClient();
  return new CanonicalScheduleService(
    supabase,
    new SupabaseScheduleRepository(supabase),
    new SeasonService(new SupabaseSeasonRepository(supabase)),
    new TeamService(new SupabaseScheduleTeamRepository(supabase)),
    new SupabaseCourseRepository(supabase),
  );
}
