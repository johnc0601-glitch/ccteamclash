import {notFound} from 'next/navigation';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {MatchHero} from '@/components/matches/MatchHero';
import {MatchRosterBoard} from '@/components/matches/MatchRosterBoard';
import {MatchScoreboard} from '@/components/matches/MatchScoreboard';
import {MatchStateBanner} from '@/components/matches/MatchStateBanner';
import {createServerResultsService} from '@/core/createServerResultsService';
import {createServerScheduleService} from '@/core/createServerScheduleService';
import {SupabaseLaunchRepository} from '@/domain/launch/SupabaseLaunchRepository';
import {createClient} from '@/lib/supabase/server';
import {resolveMatchday} from '@/services/matches/MatchdayService';
import styles from './Matchday.module.css';

export const dynamic = 'force-dynamic';

type MatchdayPageProps = {
  params: Promise<{id: string}>;
};

export default async function MatchdayPage({params}: MatchdayPageProps) {
  const {id: matchId} = await params;
  const [scheduleService, resultsService, supabase] = await Promise.all([
    createServerScheduleService(),
    createServerResultsService(),
    createClient(),
  ]);
  const launchRepository = new SupabaseLaunchRepository(supabase);
  const [event, match, publishedResult, teams, players, courses] = await Promise.all([
    scheduleService.getPublishedEventById(matchId),
    scheduleService.getMatch(matchId),
    resultsService.getPublishedResult(matchId),
    launchRepository.getTeams(),
    launchRepository.getPlayers(),
    scheduleService.getCourses(),
  ]);

  if (!event || !match) notFound();
  const matchday = resolveMatchday(
    event,
    match,
    teams,
    players,
    courses,
    Boolean(publishedResult),
  );
  if (!matchday) notFound();

  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <MatchHero matchday={matchday} />
        <div className={`shell ${styles.content}`}>
          <MatchStateBanner lifecycle={matchday.lifecycle} />
          {publishedResult ? <MatchScoreboard matchday={matchday} result={publishedResult} /> : null}
          <MatchRosterBoard matchday={matchday} />
          {!publishedResult ? <MatchScoreboard matchday={matchday} result={undefined} /> : null}
        </div>
      </main>
      <Footer />
    </>
  );
}
