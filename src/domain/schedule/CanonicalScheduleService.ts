import {
  ScheduleService,
  type PublicScheduleEvent,
} from '@/domain/schedule/ScheduleService';
import {getMatchPublicIdentities, publicMatchHref} from '@/services/matches/MatchPublicIdentity';

type ScheduleServiceArgs = ConstructorParameters<typeof ScheduleService>;

/**
 * ScheduleService with one additional responsibility: public links are built
 * from the canonical match slug when Match Identity V2 is available.
 *
 * Internal event IDs remain the immutable launch_schedule_matches.id values so
 * results, rosters, attendance, Matchday actions, and historical references do
 * not change.
 */
export class CanonicalScheduleService extends ScheduleService {
  constructor(
    private readonly identityClient: any,
    ...args: ScheduleServiceArgs
  ) {
    super(...args);
  }

  override async getPublishedEvents(referenceDate = new Date()): Promise<PublicScheduleEvent[]> {
    const events = await super.getPublishedEvents(referenceDate);
    if (!events.length) return events;

    const identities = await getMatchPublicIdentities(
      this.identityClient,
      events.map((event) => event.id),
    );

    return events.map((event) => ({
      ...event,
      href: publicMatchHref(identities.get(event.id) ?? {matchId: event.id, publicSlug: null}),
    }));
  }
}
