import {OfficePage} from '@/components/commissioner/OfficePage';
import {ResultsManagement} from '@/components/results/ResultsManagement';
import {createServerResultsService} from '@/core/createServerResultsService';
import {createServerScheduleService} from '@/core/createServerScheduleService';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';

type ResultsPageProps = {
  searchParams: Promise<{matchId?: string | string[]}>;
};

export default async function OfficeResultsPage({searchParams}: ResultsPageProps) {
  const params = await searchParams;
  const rawMatchId = params.matchId;
  const requestedId = typeof rawMatchId === 'string' && rawMatchId.length <= 200
    ? rawMatchId.trim() : '';
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
  // Commissioner test/review links can open the exact official match.
  // Never guess a fixture from a TC Whiteboard team name or date.
  const requestedMatch = requestedId ? await scheduleService.getMatch(requestedId) : undefined;
  const requestedRoundValid = Boolean(requestedMatch && rounds.some((round) => round.id === requestedMatch.roundId));
  const initialRoundId = requestedRoundValid ? requestedMatch!.roundId : rounds[0]?.id ?? '';
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
        initialMatchId={requestedRoundValid ? requestedMatch!.id : ''}
        requestedMatchNotFound={Boolean(requestedId && !requestedRoundValid)}
      />
    </OfficePage>
  );
}
