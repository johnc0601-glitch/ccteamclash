import {SupabaseCourseRepository} from '@/domain/course/SupabaseCourseRepository';
import {CanonicalScheduleService} from '@/domain/schedule/CanonicalScheduleService';
import {SupabaseScheduleRepository} from '@/domain/schedule/SupabaseScheduleRepository';
import {SeasonService} from '@/domain/season/SeasonService';
import {SupabaseSeasonRepository} from '@/domain/season/SupabaseSeasonRepository';
import {createClient} from '@/lib/supabase/server';
import {SupabaseScheduleTeamRepository} from '@/repositories/SupabaseScheduleTeamRepository';
import {TeamService} from '@/services/TeamService';

export async function createServerScheduleService(): Promise<CanonicalScheduleService> {
  const supabase = await createClient();
  return new CanonicalScheduleService(
    supabase,
    new SupabaseScheduleRepository(supabase),
    new SeasonService(new SupabaseSeasonRepository(supabase)),
    new TeamService(new SupabaseScheduleTeamRepository(supabase)),
    new SupabaseCourseRepository(supabase),
  );
}
