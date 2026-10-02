import Link from 'next/link';
import {redirect} from 'next/navigation';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {CaptainRosterPanel} from '@/components/matches/CaptainRosterPanel';
import {MatchRosterService} from '@/domain/match-roster/MatchRosterService';
import {isMatchRosterLocked} from '@/domain/match-roster/MatchRosterLock';
import {SeasonAwareMatchRosterRepository} from '@/domain/match-roster/SeasonAwareMatchRosterRepository';
import {createClient} from '@/lib/supabase/server';
import {getPublicMatchHref} from '@/services/matches/MatchPublicIdentity';
import styles from '@/app/matches/[id]/Matchday.module.css';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{id: string}>;
  searchParams?: Promise<{
    captainNotice?: string | string[];
    captainError?: string | string[];
  }>;
};

export default async function CaptainMatchRosterPage({params, searchParams}: Props) {
  const {id: matchId} = await params;
  const query = searchParams ? await searchParams : {};
  const supabase = await createClient();
  const {data: {user}, error: userError} = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(`/account?error=${encodeURIComponent('Sign in with an approved captain account.')}`);
  }

  const repository = new SeasonAwareMatchRosterRepository(supabase);
  const service = new MatchRosterService(repository);
  const [match, publicMatchPath, managed] = await Promise.all([
    repository.getAttendanceMatch(matchId),
    getPublicMatchHref(supabase, matchId),
    service.getManagedTeamRosters(user.id, matchId),
  ]);

  if (!match) redirect('/schedule?error=Match is unavailable.');

  let rosters = managed;
  if (isMatchRosterLocked(match)) {
    const actor = await repository.getAttendanceActor(user.id);
    const allowedTeamId = actor?.profileRole === 'Captain' && actor.captainTeamId
      ? await getUnlockedCaptainTeamId(supabase, matchId, actor.captainTeamId)
      : undefined;

    rosters = allowedTeamId
      ? managed
        .filter((roster) => roster.teamId === allowedTeamId)
        .map((roster) => ({...roster, attendanceOpen: true}))
      : [];
  }

  const teamIds = [...new Set(rosters.map((roster) => roster.teamId))];
  const {data: teams} = teamIds.length
    ? await supabase.from('launch_teams').select('id,name').in('id', teamIds)
    : {data: [] as Array<{id: string; name: string}>};

  const teamNames = Object.fromEntries(
    (teams ?? []).map((team) => [team.id, team.name]),
  );

  return (
    <>
      <SiteHeader />
      <main className={styles.page}>
        <div className={`shell ${styles.content}`} style={{paddingTop: 24}}>
          <section className={styles.sectionCard}>
            <header className={styles.sectionHeader}>
              <div>
                <span>Captain controls</span>
                <h1 style={{margin: 0}}>Manage Match Roster</h1>
              </div>
              <Link href={publicMatchPath}>View Matchday</Link>
            </header>
          </section>

          {rosters.length ? (
            <CaptainRosterPanel
              rosters={rosters}
              teamNames={teamNames}
              notice={readParam(query.captainNotice)}
              error={readParam(query.captainError)}
            />
          ) : (
            <section className={styles.sectionCard}>
              <header className={styles.sectionHeader}>
                <div>
                  <span>Roster status</span>
                  <h2>Management unavailable</h2>
                </div>
              </header>
              <p className={styles.empty}>
                This match roster is locked or your account does not manage a team in this match.
              </p>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}

async function getUnlockedCaptainTeamId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  matchId: string,
  teamId: string,
): Promise<string | undefined> {
  const {data, error} = await (supabase as any)
    .from('launch_match_roster_unlocks')
    .select('team_id')
    .eq('match_id', matchId)
    .eq('team_id', teamId)
    .is('relocked_at', null)
    .maybeSingle();

  if (error || !data?.team_id) return undefined;
  return data.team_id;
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
