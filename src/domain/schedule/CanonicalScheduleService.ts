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
};

export type CanonicalTeamScheduleEvent = TeamScheduleEvent & {
  lifecycle: MatchStatus;
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
    const events = await super.getPublishedEvents(referenceDate);
    if (!events.length) return [];

    const ids = events.map((event) => event.id);
    const [identities, lifecycleResult] = await Promise.all([
      getMatchPublicIdentities(this.identityClient, ids),
      this.identityClient
        .from('launch_schedule_matches')
        .select('id,status')
        .in('id', ids),
    ]);
    if (lifecycleResult.error) throw lifecycleResult.error;

    const lifecycles = new Map<string, MatchStatus>(
      (lifecycleResult.data ?? []).map((row: {id: string; status: MatchStatus}) => [row.id, row.status]),
    );

    return events.map((event) => {
      const lifecycle = lifecycles.get(event.id) ?? 'Scheduled';
      const bucket = resolvePublicScheduleBucket(lifecycle, event.dateTime, referenceDate);
      return {
        ...event,
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
      const nextDate = dateKey(upcoming[0].dateTime);
      return upcoming.filter((event) => dateKey(event.dateTime) === nextDate);
    }
    return events
      .filter((event) => event.bucket === 'recent')
      .sort((left, right) => right.dateTime.getTime() - left.dateTime.getTime());
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

function dateKey(value: Date): string {
  return `${value.getFullYear()}-${value.getMonth()}-${value.getDate()}`;
}
