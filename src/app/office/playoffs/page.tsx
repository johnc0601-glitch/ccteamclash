import {OfficePage} from '@/components/commissioner/OfficePage';
import {PlayoffManagement} from '@/components/playoffs/PlayoffManagement';
import {createServerPlayoffService} from '@/core/createServerPlayoffService';
import {createServerScheduleService} from '@/core/createServerScheduleService';
import {createServerStandingsService} from '@/core/createServerStandingsService';

export default async function OfficePlayoffsPage() {
  const standingsService = await createServerStandingsService();
  const active = await standingsService.getActiveSeasonStandings();
  if (!active) return <OfficePage sectionId="playoffs"><p>No active season is available.</p></OfficePage>;
  const [playoffs, schedules] = await Promise.all([
    createServerPlayoffService(),
    createServerScheduleService(),
  ]);
  const allSchedules = await schedules.getSchedules({seasonId: active.season.id});
  const rounds = (await Promise.all(allSchedules.map((schedule) => schedules.getRounds(schedule.id)))).flat();
  const matches = (await Promise.all(rounds.map((round) => schedules.getMatches(round.id)))).flat();
  const placeholders = matches.filter((match) => !match.homeTeamId && !match.awayTeamId);
  const view = await playoffs.getBracket(active.season.id);
  return (
    <OfficePage sectionId="playoffs">
      <PlayoffManagement seasonId={active.season.id} initialView={view} placeholders={placeholders} />
    </OfficePage>
  );
}
