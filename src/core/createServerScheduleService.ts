import {SupabaseCourseRepository} from '@/domain/course/SupabaseCourseRepository';
import {ScheduleService} from '@/domain/schedule/ScheduleService';
import {SupabaseScheduleRepository} from '@/domain/schedule/SupabaseScheduleRepository';
import {SeasonService} from '@/domain/season/SeasonService';
import {SupabaseSeasonRepository} from '@/domain/season/SupabaseSeasonRepository';
import {createClient} from '@/lib/supabase/server';
import {SupabaseScheduleTeamRepository} from '@/repositories/SupabaseScheduleTeamRepository';
import {TeamService} from '@/services/TeamService';

export async function createServerScheduleService(): Promise<ScheduleService> {
  const supabase = await createClient();
  return new ScheduleService(
    new SupabaseScheduleRepository(supabase),
    new SeasonService(new SupabaseSeasonRepository(supabase)),
    new TeamService(new SupabaseScheduleTeamRepository(supabase)),
    new SupabaseCourseRepository(supabase),
  );
}
