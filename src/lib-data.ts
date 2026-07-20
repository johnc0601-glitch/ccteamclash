import type {Match, StandingEntry, Story} from '@/shared/types';
import {getLatestHistoricalTeamStandings} from '@/data/historicalSeed';

export const stories: Story[] = [
{slug:'match-5-everything-on-the-line',title:'Match 5: Everything Is on the Line',excerpt:'The standings tighten as the league heads into a pivotal weekend of Team Clash competition.',category:'Match Preview',date:'July 12, 2026',image:'hero',body:['Rivalries, standings pressure, and one of the biggest weekends of the season converge at Castle Hayne.','Every point matters as teams fight for position entering the final stretch. Expect aggressive lines, tight matches, and plenty of Team Clash energy.'],links:[{label:'View schedule',url:'/schedule'}]},
{slug:'dark-knights-statement-match',title:'Dark Knights Prepare for a Statement Match',excerpt:'A confident roster enters the weekend with playoff positioning within reach.',category:'Team News',date:'July 10, 2026',image:'purple',body:['The Dark Knights arrive focused and confident, with a chance to reshape the standings.','Their matchup with the Ninjas should be one of the closest battles of the weekend.']},
{slug:'castle-hayne-course-report',title:'Castle Hayne Is Ready for Clash Day',excerpt:'Course conditions, key holes, and what players should expect this Saturday.',category:'Course Report',date:'July 8, 2026',image:'orange',body:['Castle Hayne rewards controlled drives and confident putting.','Players should expect warm conditions and a course that will punish missed landing zones.']}
]
export const teams: StandingEntry[] = getLatestHistoricalTeamStandings().map((standing) => ({
  name: standing.teamName,
  record: standing.record.ties
    ? `${standing.record.wins}-${standing.record.losses}-${standing.record.ties}`
    : `${standing.record.wins}-${standing.record.losses}`,
  diff: `${standing.pointsPercentage.toFixed(1)}%`,
}));
export const matches: Match[] = [{date:'Saturday, July 18',time:'9:00 AM',course:'Castle Hayne Disc Golf Course',home:'Dark Knights',away:'Ninjas'},{date:'Saturday, July 18',time:'10:30 AM',course:'Castle Hayne Disc Golf Course',home:'Chain Hawks',away:'Bogey Men'}]
