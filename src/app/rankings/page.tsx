import {Footer, SiteHeader} from '@/components/SiteHeader';
import {RankingsClient} from '@/components/rankings/RankingsClient';
import {
  getLatestHistoricalPlayerSeasonSummaries,
  getLatestHistoricalSeasonName,
  isHistoricalFemalePlayer,
  type HistoricalPlayerSeasonSummary,
} from '@/data/historicalSeed';
import styles from './Rankings.module.css';

export default async function RankingsPage() {
  const currentSeasonName = getLatestHistoricalSeasonName();
  const currentRankings = buildRankings(getLatestHistoricalPlayerSeasonSummaries());

  return (
    <>
      <SiteHeader />
      <main className={`shell page-shell ${styles.rankingsPage}`}>
        <h1>Player Rankings</h1>
        <section className={styles.currentSeason}>
          <span className="eyebrow">Current season</span>
          <h2>{currentSeasonName}</h2>
          <RankingsClient
            overall={currentRankings.overall}
            women={currentRankings.women}
            total={currentRankings.total}
            sourceLabel={currentSeasonName}
          />
        </section>
      </main>
      <Footer />
    </>
  );
}

function buildRankings(summaries: HistoricalPlayerSeasonSummary[]) {
  const total = summaries.map((summary, index) => ({summary, rank: index + 1}));
  const overall = total.slice(0, 25);
  const women = total
    .filter(({summary}) => isHistoricalFemalePlayer(summary.playerName))
    .slice(0, 10)
    .map((entry, index) => ({...entry, rank: index + 1}));

  return {overall, women, total};
}
