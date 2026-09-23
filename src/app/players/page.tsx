import {unstable_cache} from 'next/cache';
import {LazyPublicPlayerDirectory} from '@/components/players/LazyPublicPlayerDirectory';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {createPublicPlayerService} from '@/core/createPublicPlayerService';
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
  const service = createPublicPlayerService();
  const searchIndexPromise = getCachedPlayerSearchIndex();
  const directPlayerPromise = initialPlayerId
    ? service.getAll('all', initialPlayerId)
    : Promise.resolve([]);
  let searchIndex = await searchIndexPromise;
  let initialViews = await directPlayerPromise;

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
        <span className="eyebrow">Player lookup</span>
        <h1>Player Search</h1>
        <p className="intro">Search for a player, then open their row for season stats, career totals, and match history.</p>
        {notice ? <p className={styles.notice}>{notice}</p> : null}
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <LazyPublicPlayerDirectory
          players={searchIndex}
          initialPlayerId={initialPlayerId ?? ''}
          initialSearch={initialSearch ?? ''}
          initialProfile={initialProfile}
        />
      </main>
      <Footer />
    </>
  );
}

const getCachedPlayerSearchIndex = unstable_cache(
  async () => createPublicPlayerService().getSearchIndex(),
  ['public-player-search-index-v1'],
  {
    revalidate: 86_400,
    tags: ['public:players', 'public:stats', 'public:teams', 'public:season'],
  },
);

function readParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
