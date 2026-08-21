import {OfficePage} from '@/components/commissioner/OfficePage';
import {ResultsExplorer} from '@/components/results/ResultsExplorer';
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
  const allMatches = (await Promise.all(
    rounds.map((round) => scheduleService.getMatches(round.id)),
  )).flat();
  const matchesWithContests = await Promise.all(allMatches.map(async (match) => ({
    ...match,
    contests: await resultsService.getContests(match.id),
  })));
  const initialRoundId = rounds[0]?.id ?? '';
  const matches = allMatches.filter((match) => match.roundId === initialRoundId);

  return (
    <OfficePage sectionId="results">
      <ResultsExplorer
        schedules={schedules}
        rounds={rounds}
        matches={matchesWithContests}
        teams={teams}
        players={players}
      />
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
