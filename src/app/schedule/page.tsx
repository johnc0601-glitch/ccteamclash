import {Footer, SiteHeader} from '@/components/SiteHeader';
import {getPublicScheduleEvents} from '@/services/public/PublicSeasonDataService';

export const revalidate = 60;

export default async function SchedulePage() {
  const publicMatches = await getPublicScheduleEvents();

  return (
    <>
      <SiteHeader />
      <main className="shell page-shell schedule-page">
        <span className="eyebrow">Published schedule</span>
        <h1>Schedule</h1>
        <div className="list-card">
          {publicMatches.length ? publicMatches.map((match) => (
            <div className="match-row" key={match.id}>
              <div>
                <b>{match.date}</b>
                <small>
                  {match.time} &middot;{' '}
                  {match.directionsUrl ? (
                    <a href={match.directionsUrl} target="_blank" rel="noreferrer">{match.course}</a>
                  ) : match.course}
                </small>
              </div>
              <strong>{match.home} <em>vs</em> {match.away}</strong>
            </div>
          )) : <p>No published matches are currently available.</p>}
        </div>
      </main>
      <Footer />
    </>
  );
}
