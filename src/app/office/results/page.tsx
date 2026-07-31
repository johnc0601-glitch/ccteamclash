import {OfficePage} from '@/components/commissioner/OfficePage';
import {ResultsManagement} from '@/components/results/ResultsManagement';
import {createServerResultsService} from '@/core/createServerResultsService';
import {createServerScheduleService} from '@/core/createServerScheduleService';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';

export default async function OfficeResultsPage() {
  const scheduleService = await createServerScheduleService();
  const resultsService = await createServerResultsService();
  const launchRepository = new SupabaseLaunchRepository(await createClient());
  const [schedules, teams, courses, results, players] = await Promise.all([
    scheduleService.getSchedules(),
    scheduleService.getTeams(),
    scheduleService.getCourses(),
    resultsService.getResults(),
    launchRepository.getPlayers(),
  ]);
  const rounds = (await Promise.all(
    schedules.map((schedule) => scheduleService.getRounds(schedule.id)),
  )).flat().sort((left, right) =>
    (left.date ?? '').localeCompare(right.date ?? '') || left.number - right.number,
  );
  const initialRoundId = rounds[0]?.id ?? '';
  const matches = initialRoundId ? await scheduleService.getMatches(initialRoundId) : [];

  return (
    <OfficePage sectionId="results">
      <ResultsManagement
        initialSchedules={schedules}
        initialRounds={rounds}
        initialMatches={matches}
        initialResults={results}
        initialTeams={teams}
        initialCourses={courses}
        initialRoundId={initialRoundId}
        initialPlayers={players}
      />
    </OfficePage>
  );
}
