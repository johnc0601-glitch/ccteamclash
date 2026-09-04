import type {MatchStatus} from '@/domain/schedule/Match';
import {
  isHomepageScheduleEventVisible,
  isUpcomingScheduleEvent,
  resolvePublicScheduleBucket,
} from '@/domain/schedule/PublicScheduleEventState';
import {
  ScheduleService,
  type PublicScheduleEvent,
  type TeamScheduleEvent,
} from '@/domain/schedule/ScheduleService';
import {getMatchPublicIdentities, publicMatchHref} from '@/services/matches/MatchPublicIdentity';

type ScheduleServiceArgs = ConstructorParameters<typeof ScheduleService>;

export type CanonicalPublicScheduleEvent = PublicScheduleEvent & {
  lifecycle: MatchStatus;
  roundId: string;
};

export type CanonicalTeamScheduleEvent = TeamScheduleEvent & {
  lifecycle: MatchStatus;
  roundId: string;
};

/**
 * ScheduleService with public identity and lifecycle normalization layered over
 * the existing schedule engine.
 *
 * Internal event IDs remain the immutable launch_schedule_matches.id values so
 * results, rosters, attendance, Matchday actions, and historical references do
 * not change. Public hrefs and lifecycle are presentation metadata only.
 */
export class CanonicalScheduleService extends ScheduleService {
  constructor(
    private readonly identityClient: any,
    ...args: ScheduleServiceArgs
  ) {
    super(...args);
  }

  override async getPublishedEvents(referenceDate = new Date()): Promise<CanonicalPublicScheduleEvent[]> {
    const [datedEvents, schedulesResult, roundsResult, tbdMatchesResult] = await Promise.all([
      super.getPublishedEvents(referenceDate),
      this.identityClient
        .from('launch_schedules')
        .select('id,published')
        .eq('published', true),
      this.identityClient
        .from('launch_rounds')
        .select('id,schedule_id,date,published')
        .eq('published', true),
      this.identityClient
        .from('launch_schedule_matches')
        .select('id,round_id,home_team_id,away_team_id,course_id,date,time,status')
        .is('date', null),
    ]);

    if (schedulesResult.error) throw schedulesResult.error;
    if (roundsResult.error) throw roundsResult.error;
    if (tbdMatchesResult.error) throw tbdMatchesResult.error;

    const publishedScheduleIds = new Set<string>(
      (schedulesResult.data ?? [])
        .filter((row: {published: boolean}) => row.published === true)
        .map((row: {id: string}) => clean(row.id)),
    );
    const publishedRounds = (roundsResult.data ?? []).filter(
      (row: {schedule_id: string; published: boolean}) => (
        row.published === true && publishedScheduleIds.has(clean(row.schedule_id))
      ),
    );
    const roundDates = new Map<string, string>(
      publishedRounds
        .map((row: {id: string; date: string | null}) => [clean(row.id), clean(row.date)] as const)
        .filter(([id, date]) => Boolean(id && date)),
    );
    const publishedRoundIds = new Set(roundDates.keys());

    const tbdRows = (tbdMatchesResult.data ?? []).filter(
      (row: {round_id: string}) => publishedRoundIds.has(clean(row.round_id)),
    );

    let tbdEvents: PublicScheduleEvent[] = [];
    if (tbdRows.length) {
      const [teams, courses] = await Promise.all([this.getTeams(), this.getCourses()]);
      const teamNames = new Map(teams.map((team) => [team.id, team.name]));
      const courseDetails = new Map(courses.map((course) => [course.id, course]));

      tbdEvents = tbdRows
        .map((row: any): PublicScheduleEvent | null => {
          const id = clean(row.id);
          const roundId = clean(row.round_id);
          const homeTeamId = clean(row.home_team_id);
          const awayTeamId = clean(row.away_team_id);
          const courseId = clean(row.course_id);
          const time = clean(row.time).slice(0, 5);
          const anchorDate = roundDates.get(roundId) ?? '';
          if (!id || !roundId || !homeTeamId || !awayTeamId || !courseId || !time || !anchorDate) {
            return null;
          }

          const dateTime = new Date(`${anchorDate}T${time}:00`);
          const safeDateTime = Number.isNaN(dateTime.getTime())
            ? new Date(`${anchorDate}T00:00:00`)
            : dateTime;
          const course = courseDetails.get(courseId);

          return {
            id,
            href: `/matches/${id}`,
            date: 'TBD',
            time: formatEventTime(time),
            course: course?.name ?? courseId,
            directionsUrl: course?.mapUrl ?? '',
            home: teamNames.get(homeTeamId) ?? homeTeamId,
            away: teamNames.get(awayTeamId) ?? awayTeamId,
            homeTeamId,
            awayTeamId,
            dateTime: safeDateTime,
            bucket: 'upcoming',
            status: 'Scheduled',
          };
        })
        .filter((event: PublicScheduleEvent | null): event is PublicScheduleEvent => Boolean(event));
    }

    const events = [...datedEvents, ...tbdEvents]
      .sort((left, right) => left.dateTime.getTime() - right.dateTime.getTime());
    if (!events.length) return [];

    const ids = events.map((event) => event.id);
    const [identities, lifecycleResult] = await Promise.all([
      getMatchPublicIdentities(this.identityClient, ids),
      this.identityClient
        .from('launch_schedule_matches')
        .select('id,status,round_id')
        .in('id', ids),
    ]);
    if (lifecycleResult.error) throw lifecycleResult.error;

    const lifecycles = new Map<string, MatchStatus>(
      (lifecycleResult.data ?? []).map((row: {id: string; status: MatchStatus}) => [row.id, row.status]),
    );
    const roundIds = new Map<string, string>(
      (lifecycleResult.data ?? []).map((row: {id: string; round_id: string}) => [row.id, clean(row.round_id)]),
    );

    return events.map((event) => {
      const lifecycle = lifecycles.get(event.id) ?? 'Scheduled';
      const roundId = roundIds.get(event.id);
      if (!roundId) throw new Error(`Published match ${event.id} is missing its round identity.`);
      const bucket = resolvePublicScheduleBucket(lifecycle, event.dateTime, referenceDate);
      return {
        ...event,
        roundId,
        href: publicMatchHref(identities.get(event.id) ?? {matchId: event.id, publicSlug: null}),
        lifecycle,
        bucket,
        status: bucket === 'upcoming' ? 'Scheduled' : bucket === 'recent' ? 'Recent' : 'Past',
      };
    });
  }

  override async getHomePageEvents(referenceDate = new Date()): Promise<CanonicalPublicScheduleEvent[]> {
    const events = (await this.getPublishedEvents(referenceDate))
      .filter((event) => isHomepageScheduleEventVisible(event.lifecycle));
    const upcoming = events.filter(
      (event) => event.bucket === 'upcoming' && isUpcomingScheduleEvent(event.lifecycle),
    );
    if (upcoming.length) {
      const nextRoundId = upcoming[0].roundId;
      return events
        .filter((event) => event.roundId === nextRoundId)
        .sort((left, right) => left.dateTime.getTime() - right.dateTime.getTime())
        .slice(0, 4);
    }

    const recent = events
      .filter((event) => event.bucket === 'recent')
      .sort((left, right) => right.dateTime.getTime() - left.dateTime.getTime());
    const latestRoundId = recent[0]?.roundId;
    return latestRoundId
      ? recent.filter((event) => event.roundId === latestRoundId).slice(0, 4)
      : [];
  }

  override async getTeamEvents(
    teamId: string,
    referenceDate = new Date(),
  ): Promise<CanonicalTeamScheduleEvent[]> {
    return (await this.getPublishedEvents(referenceDate))
      .filter((event) => event.homeTeamId === teamId || event.awayTeamId === teamId)
      .map((event) => ({
        ...event,
        opponent: event.homeTeamId === teamId ? event.away : event.home,
        isHome: event.homeTeamId === teamId,
      }));
  }

  override async getTeamNextEvent(
    teamId: string,
    referenceDate = new Date(),
  ): Promise<CanonicalTeamScheduleEvent | undefined> {
    return (await this.getTeamEvents(teamId, referenceDate))
      .find((event) => event.bucket === 'upcoming' && isUpcomingScheduleEvent(event.lifecycle));
  }
}

function formatEventTime(value: string): string {
  const [hours, minutes] = value.split(':').map(Number);
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, hours, minutes));
}

function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
