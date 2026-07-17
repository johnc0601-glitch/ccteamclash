import Link from 'next/link';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {services} from '@/core/ServiceContainer';
import {matches} from '@/lib-data';

export default async function SchedulePage() {
  const courses = await services.courses.getAll({status: 'active'});
  const directionsByCourse = new Map(courses.map((course) => [course.name, course.mapUrl]));

  return (
    <>
      <SiteHeader />
      <main className="shell page-shell">
        <span className="eyebrow">2026 season</span>
        <h1>Schedule</h1>
        <div className="list-card">
          {matches.map((match) => {
            const directions = directionsByCourse.get(match.course);
            return (
              <div className="match-row" key={`${match.date}-${match.home}`}>
                <div>
                  <b>{match.date}</b>
                  <small>{match.time} &middot; {match.course}</small>
                  {directions ? <a className="gold-link" href={directions} target="_blank" rel="noreferrer">Directions</a> : null}
                </div>
                <strong>{match.home} <em>vs</em> {match.away}</strong>
              </div>
            );
          })}
        </div>
        <Link className="button" href="/courses">All course directions</Link>
      </main>
      <Footer />
    </>
  );
}
