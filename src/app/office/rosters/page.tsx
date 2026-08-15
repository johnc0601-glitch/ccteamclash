import {OfficePage} from '@/components/commissioner/OfficePage';
import {SeasonRosterManagement} from '@/components/season-rosters/SeasonRosterManagement';
import {createServerSeasonRosterService} from '@/core/createServerSeasonRosterService';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {SupabaseSeasonRepository} from '@/domain/season/SupabaseSeasonRepository';
import {buildSeasonRosterTeamViews} from '@/domain/season-roster/SeasonRosterPresentation';
import {createClient} from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function OfficeRostersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const launchRepository = new SupabaseLaunchRepository(supabase);
  const seasonRepository = new SupabaseSeasonRepository(supabase);
  const rosterService = await createServerSeasonRosterService();
  const seasons = await seasonRepository.getAll();
  const requestedSeason = readParam(params.seasonId);
  const season = seasons.find((item) => item.id === requestedSeason)
    ?? seasons.find((item) => item.active && !item.archived)
    ?? seasons[0];

  if (!season) {
    return <OfficePage sectionId="rosters"><p>No season is available for roster management.</p></OfficePage>;
  }

  const [seasonTeams, memberships, teams, players] = await Promise.all([
    rosterService.listSeasonTeams(season.id),
    rosterService.listMemberships(season.id),
    launchRepository.getTeams(),
    launchRepository.getPlayers(),
  ]);
  const teamViews = buildSeasonRosterTeamViews({
    season, seasonTeams, memberships, teams, players,
    viewer: {role: 'Commissioner', teamId: null},
  });

  return (
    <OfficePage sectionId="rosters">
      <form method="get" className="office-roster-season-picker">
        <label htmlFor="seasonId">Season</label>
        <select id="seasonId" name="seasonId" defaultValue={season.id}>
          {seasons.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <button type="submit">View roster</button>
      </form>
      <SeasonRosterManagement
        season={season}
        teamViews={teamViews}
        returnPath="/office/rosters"
        notice={readParam(params.rosterNotice)}
        error={readParam(params.rosterError)}
      />
    </OfficePage>
  );
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
