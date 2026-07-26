import Link from 'next/link';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {services} from '@/core/ServiceContainer';
import {getScheduleGroups, type PublicEvent} from '@/services/matches/EventService';
import {createSlug} from '@/shared/utils';

export default async function SchedulePage() {
  const courses = await services.courses.getAll({status: 'active'});
  const directionsByCourse = new Map(courses.map((course) => [createSlug(course.name), course.mapUrl]));
  const groups = getScheduleGroups();

  return (
    <>
      <SiteHeader />
      <main className="shell page-shell">
        <span className="eyebrow">2026 season</span>
        <h1>Schedule</h1>
        <div className="list-card">
          <ScheduleGroup title="Upcoming" events={groups.upcoming} directionsByCourse={directionsByCourse} />
          <ScheduleGroup title="Recent" events={groups.recent} directionsByCourse={directionsByCourse} />
          <ScheduleGroup title="Past" events={groups.past} directionsByCourse={directionsByCourse} />
        </div>
        <Link className="button" href="/courses">All course directions</Link>
      </main>
      <Footer />
    </>
  );
}

function ScheduleGroup({title, events, directionsByCourse}: {
  title: string;
  events: PublicEvent[];
  directionsByCourse: Map<string, string>;
}) {
  if (!events.length) return null;

  return (
    <section className="schedule-group">
      <h2>{title}</h2>
      {events.map((match) => {
        const directions = findDirections(match.course, directionsByCourse);
        return (
          <div className="match-row" key={match.id}>
            <div>
              <b>{match.date}</b>
              <small>
                {match.time} &middot;{' '}
                {directions ? <a href={directions} target="_blank" rel="noreferrer">{match.course}</a> : match.course}
              </small>
            </div>
            <strong>
              <Link href={match.href}>{match.home} <em>vs</em> {match.away}</Link>
            </strong>
          </div>
        );
      })}
    </section>
  );
}

function findDirections(courseName: string, directionsByCourse: Map<string, string>): string | undefined {
  const courseSlug = createSlug(courseName);
  const exact = directionsByCourse.get(courseSlug);
  if (exact) return exact;

  for (const [candidate, directions] of directionsByCourse) {
    const sharedWords = candidate
      .split('-')
      .filter((word) => word.length > 3 && courseSlug.includes(word));
    if (sharedWords.length >= 2) return directions;
  }

  return undefined;
}
