import {LazyPublicPlayerDirectory} from '@/components/players/LazyPublicPlayerDirectory';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {createServerPublicPlayerService} from '@/core/createServerPublicPlayerService';
import {createClient} from '@/lib/supabase/server';
import {createProfileFromPublicPlayerView} from '@/services/playerProfiles';
import type {
  PublicPlayerSearchEntry,
  PublicPlayerView,
} from '@/services/public/PublicPlayerService';
import styles from './Players.module.css';

type PlayersPageProps = {
  searchParams: Promise<{
    player?: string | string[];
    search?: string | string[];
    notice?: string | string[];
    error?: string | string[];
  }>;
};

type CaptainFreeAgent = {
  application_id: string;
  player_id: string | null;
};

type PickupMode = 'captain' | 'commissioner' | null;

type CommissionerTeamOption = {
  id: string;
  name: string;
};

type PlayerPickupContext = {
  claimableApplications: Record<string, string>;
  commissionerTeams: CommissionerTeamOption[];
  mode: PickupMode;
};

type FreeAgentListClient = {
  rpc: (
    fn: 'captain_list_launch_free_agents',
  ) => Promise<{data: CaptainFreeAgent[] | null; error: {message: string} | null}>;
};

function normalizeSearchText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function formatRecord(record: {wins: number; losses: number; ties: number}): string {
  return record.ties
    ? `${record.wins}-${record.losses}-${record.ties}`
    : `${record.wins}-${record.losses}`;
}

function searchEntryFromView(view: PublicPlayerView): PublicPlayerSearchEntry {
  const statistics = view.currentStatistics ?? view.careerStatistics;
  return {
    id: view.player.id,
    name: view.player.name,
    pdgaNumber: view.player.pdgaNumber,
    teamName: view.teamName,
    record: formatRecord(statistics.overallRecord),
    recordLabel: view.currentStatistics ? view.currentSeasonName : 'Career',
  };
}

export default async function PlayersPage({searchParams}: PlayersPageProps) {
  const query = await searchParams;
  const initialPlayerId = readParam(query.player);
  const initialSearch = readParam(query.search);
  const notice = readParam(query.notice);
  const error = readParam(query.error);
  const service = await createServerPublicPlayerService();
  const searchIndexPromise = service.getSearchIndex();
  const playerPickupPromise = getPlayerPickupContext();
  const directPlayerPromise = initialPlayerId
    ? service.getAll('all', initialPlayerId)
    : Promise.resolve([]);
  let searchIndex = await searchIndexPromise;
  let initialViews = await directPlayerPromise;
  const playerPickup = await playerPickupPromise;

  if (!initialPlayerId && initialSearch) {
    const normalizedInitialSearch = normalizeSearchText(initialSearch);
    const exactSearchPlayer = searchIndex.find((player) =>
      normalizeSearchText(player.name) === normalizedInitialSearch,
    );
    if (exactSearchPlayer) {
      initialViews = await service.getAll('all', exactSearchPlayer.id);
    }
  }

  const initialView = initialViews[0];
  if (initialView && !searchIndex.some((player) => player.id === initialView.player.id)) {
    searchIndex = [...searchIndex, searchEntryFromView(initialView)]
      .sort((first, second) => first.name.localeCompare(second.name));
  }
  const initialProfile = initialView
    ? createProfileFromPublicPlayerView(initialView)
    : undefined;

  return (
    <>
      <SiteHeader />
      <main className={`shell page-shell ${styles.page}`}>
        <span className="eyebrow">League players</span>
        <h1>Players</h1>
        <p className="intro">Search for a player, then open their row for season stats, career totals, and match history.</p>
        {notice ? <p className={styles.notice}>{notice}</p> : null}
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <LazyPublicPlayerDirectory
          players={searchIndex}
          initialPlayerId={initialPlayerId ?? ''}
          initialSearch={initialSearch ?? ''}
          initialProfile={initialProfile}
          claimableApplications={playerPickup.claimableApplications}
          pickupMode={playerPickup.mode}
          commissionerTeams={playerPickup.commissionerTeams}
        />
      </main>
      <Footer />
    </>
  );
}

async function getPlayerPickupContext(): Promise<PlayerPickupContext> {
  const empty: PlayerPickupContext = {
    claimableApplications: {},
    commissionerTeams: [],
    mode: null,
  };

  try {
    const supabase = await createClient();
    const {data: {user}} = await supabase.auth.getUser();
    if (!user) return empty;

    const {data: profile, error: profileError} = await (supabase as any)
      .from('launch_profiles')
      .select('role, status, captain_team_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (
      profileError
      || !profile
      || profile.status !== 'Approved'
      || (profile.role !== 'Captain' && profile.role !== 'Commissioner')
    ) {
      return empty;
    }
    if (profile.role === 'Captain' && !profile.captain_team_id) return empty;

    const {data, error} = await (supabase as unknown as FreeAgentListClient)
      .rpc('captain_list_launch_free_agents');
    if (error) return empty;

    const claimableApplications = Object.fromEntries(
      (data ?? [])
        .filter((entry): entry is CaptainFreeAgent & {player_id: string} => Boolean(entry.player_id))
        .map((entry) => [entry.player_id, entry.application_id]),
    );

    if (profile.role === 'Captain') {
      return {claimableApplications, commissionerTeams: [], mode: 'captain'};
    }

    const {data: season} = await (supabase as any)
      .from('launch_seasons')
      .select('id')
      .eq('active', true)
      .eq('published', true)
      .eq('archived', false)
      .maybeSingle();
    if (!season?.id) return {claimableApplications, commissionerTeams: [], mode: 'commissioner'};

    const {data: seasonTeams} = await (supabase as any)
      .from('launch_season_teams')
      .select('team_id')
      .eq('season_id', season.id);
    const teamIds = (seasonTeams ?? [])
      .map((row: {team_id?: string}) => row.team_id)
      .filter((teamId: string | undefined): teamId is string => Boolean(teamId));
    if (!teamIds.length) return {claimableApplications, commissionerTeams: [], mode: 'commissioner'};

    const {data: teams} = await (supabase as any)
      .from('launch_teams')
      .select('id, name')
      .in('id', teamIds)
      .eq('active', true)
      .order('name');

    return {
      claimableApplications,
      commissionerTeams: (teams ?? []) as CommissionerTeamOption[],
      mode: 'commissioner',
    };
  } catch {
    return empty;
  }
}

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
