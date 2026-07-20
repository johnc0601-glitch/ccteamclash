import {Footer, SiteHeader} from '@/components/SiteHeader';
import {RankingsClient} from '@/components/rankings/RankingsClient';
import {
  getLatestHistoricalPlayerSeasonSummaries,
  getLatestHistoricalSeasonName,
} from '@/data/historicalSeed';
import styles from './Rankings.module.css';

export default async function RankingsPage() {
  const lastSeasonName = getLatestHistoricalSeasonName();
  const total = getLatestHistoricalPlayerSeasonSummaries()
    .map((summary, index) => ({summary, rank: index + 1}));
  const overall = total.slice(0, 25);
  const women = total.filter(({summary}) => summary.playerName).slice(0, 0);

  return (
    <>
      <SiteHeader />
      <main className={`shell page-shell ${styles.rankingsPage}`}>
        <span className="eyebrow">{lastSeasonName}</span>
        <h1>Player Rankings</h1>
        <RankingsClient overall={overall} women={women} total={total} />
      </main>
      <Footer />
    </>
  );
}
