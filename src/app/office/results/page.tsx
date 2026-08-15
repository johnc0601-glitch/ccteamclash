import {OfficePage} from '@/components/commissioner/OfficePage';
import {ResultsManagement} from '@/components/results/ResultsManagement';
import {createServerResultsService} from '@/core/createServerResultsService';
import {createServerScheduleService} from '@/core/createServerScheduleService';

export default async function OfficeResultsPage() {
  const scheduleService = await createServerScheduleService();
  const resultsService = await createServerResultsService();
  const [schedules, teams, courses, results] = await Promise.all([
    scheduleService.getSchedules(),
    scheduleService.getTeams(),
    scheduleService.getCourses(),
    resultsService.getResults(),
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
      />
    </OfficePage>
  );
}
