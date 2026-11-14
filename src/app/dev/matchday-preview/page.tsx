import {notFound} from 'next/navigation';
import {FinalMatchdayV2} from '@/components/matches/FinalMatchdayV2';
import {MatchPredictionCard} from '@/components/matches/MatchPredictionCard';
import {MatchdaySection} from '@/components/matches/MatchdaySection';
import type {FinalMatchdayV2Snapshot} from '@/services/matches/FinalMatchdayCanary';
const team = (id: string, name: string, color: string) => ({id, name, shortName: name, logo: '', primaryColor: color, secondaryColor: null});
const snapshot: FinalMatchdayV2Snapshot = {
  matchId: 'preview-fixture', roundNumber: 3, date: '2026-12-05', time: '09:00', publishedAt: '2026-12-05T22:00:00Z',
  course: {id: 'example', name: 'Example course', mapUrl: null}, awayTeam: team('away', 'Away Team', '#278fd2'), homeTeam: team('home', 'Home Team', '#d4558b'),
  awayScore: 2, homeScore: 2, weather: null, adjustments: [], contests: [
    {id: 'one', format: 'Singles', position: 1, awayOutcome: 'W', homeOutcome: 'L', awayPlayers: [{id: 'a', name: 'Away Player One'}], homePlayers: [{id: 'h', name: 'Home Player One'}]},
    {id: 'two', format: 'Singles', position: 2, awayOutcome: 'L', homeOutcome: 'W', awayPlayers: [{id: 'b', name: 'Away Player Two'}], homePlayers: [{id: 'i', name: 'Home Player Two'}]},
    {id: 'three', format: 'Doubles', position: 1, awayOutcome: 'T', homeOutcome: 'T', awayPlayers: [{id: 'a', name: 'Away Player One'}, {id: 'b', name: 'Away Player Two'}], homePlayers: [{id: 'h', name: 'Home Player One'}, {id: 'i', name: 'Home Player Two'}]},
  ],
};
export default function Preview() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <><p style={{textAlign: 'center'}}>Local design preview · example data</p><FinalMatchdayV2 snapshot={snapshot}>
    <a href="https://tcwhiteboard.com" target="_blank" rel="noreferrer">View scoring on TCWhiteboard</a>
    <MatchdaySection title="Official roster"><p>Official roster stays available here.</p></MatchdaySection>
    <MatchdaySection title="Saved prematch estimates"><MatchPredictionCard actor={{profileRole: 'Captain', profileStatus: 'Approved'}} prediction={{state: 'calculated', source: 'matchLineup', stageLabel: 'Match lineup', strengthLabel: 'CI', displayLabel: 'Early estimate', readiness: 'Ready', confidence: 'Full', awayStrength: 900, homeStrength: 900, homeChanceOfVictory: .69, awayChanceOfVictory: .31, venueNote: '', updateNote: ''}} awayTeamName="Away Team" homeTeamName="Home Team" /></MatchdaySection>
    <MatchdaySection title="Match preview"><p>The original preview remains on the same page.</p></MatchdaySection>
    <MatchdaySection title="Team information"><p>Team statistics stay available here.</p></MatchdaySection>
    <MatchdaySection title="Course & recorded conditions"><p>Example course</p></MatchdaySection>
    <MatchdaySection title="Match feed & photos"><p>The match feed stays available here.</p></MatchdaySection>
  </FinalMatchdayV2></>;
}
