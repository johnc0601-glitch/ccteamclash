import Link from 'next/link';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import {
  getHistoricalSeasonArchives,
  type HistoricalSeasonArchive,
  type HistoricalTeamSeasonStanding,
} from '@/data/historicalSeed';
import styles from './History.module.css';

type HistoryProps = {
  searchParams: Promise<{season?: string | string[]}>;
};

type PlayoffMatch = {
  round: 'Semifinal' | 'Championship';
  label: string;
  awayTeamId: string;
  awayTeamName: string;
  awayScore: number;
  homeTeamId: string;
  homeTeamName: string;
  homeScore: number;
};

const PLAYOFFS_BY_SEASON: Record<string, PlayoffMatch[]> = {
  'coastal-clash-2024-2025': [
    {
      round: 'Semifinal',
      label: 'Semifinal 1',
      awayTeamId: 'hayneous-og-s',
      awayTeamName: "Hayneous OG's",
      awayScore: 6,
      homeTeamId: 'dark-knights',
      homeTeamName: 'Dark Knights',
      homeScore: 13,
    },
    {
      round: 'Semifinal',
      label: 'Semifinal 2',
      awayTeamId: 'kb',
      awayTeamName: 'KB',
      awayScore: 7,
      homeTeamId: 'cougar-country',
      homeTeamName: 'Cougar Country',
      homeScore: 10,
    },
    {
      round: 'Championship',
      label: 'Championship',
      awayTeamId: 'cougar-country',
      awayTeamName: 'Cougar Country',
      awayScore: 5,
      homeTeamId: 'dark-knights',
      homeTeamName: 'Dark Knights',
      homeScore: 12,
    },
  ],
};

// Add a public spreadsheet/archive URL here when a season source is ready.
// The History UI only renders an archive link when a real URL exists.
const SEASON_ARCHIVE_URLS: Partial<Record<string, string>> = {};

function compactSeasonName(name: string): string {
  const withoutLeagueName = name.replace(/^Coastal Clash Match Play\s*/i, '');
  return withoutLeagueName.replace(/(\d{4})-(\d{4})/, (_match, firstYear: string, secondYear: string) =>
    `${firstYear}–${secondYear.slice(2)}`);
}

function formatRecord(record: {wins: number; losses: number; ties: number}): string {
  return record.ties ? `${record.wins}-${record.losses}-${record.ties}` : `${record.wins}-${record.losses}`;
}

function getAllTimeTeamRows(archives: HistoricalSeasonArchive[]) {
  const rows = new Map<string, {
    teamId: string;
    teamName: string;
    titles: number;
    wins: number;
    losses: number;
    ties: number;
  }>();

  for (const archive of archives) {
    for (const standing of archive.standings) {
      const existing = rows.get(standing.teamId) ?? {
        teamId: standing.teamId,
        teamName: standing.teamName,
        titles: 0,
        wins: 0,
        losses: 0,
        ties: 0,
      };

      existing.wins += standing.record.wins;
      existing.losses += standing.record.losses;
      existing.ties += standing.record.ties;
      if (archive.championTeamId === standing.teamId) existing.titles += 1;
      rows.set(standing.teamId, existing);
    }
  }

  return Array.from(rows.values()).sort((first, second) =>
    second.titles - first.titles
    || second.wins - first.wins
    || first.losses - second.losses
    || first.teamName.localeCompare(second.teamName));
}

export default async function HistoryPage({searchParams}: HistoryProps) {
  const archives = getHistoricalSeasonArchives();
  const query = await searchParams;
  const requestedSeason = Array.isArray(query.season) ? query.season[0] : query.season;
  const selectedArchive = archives.find((archive) => archive.seasonId === requestedSeason);
  const activeSeason = selectedArchive?.seasonId ?? 'overall';

  return (
    <>
      <SiteHeader />
      <main className={`shell page-shell ${styles.page}`}>
        <header className={styles.pageHeader}>
          <span className="eyebrow">League archive</span>
          <h1>History</h1>
          <p>Champions, postseason results, final standings and the season-by-season story of Coastal Clash.</p>
        </header>

        <nav className={styles.seasonSelector} aria-label="History season">
          <Link href="/history" className={activeSeason === 'overall' ? styles.activeSelector : undefined}>
            Overall
          </Link>
          {archives.map((archive) => (
            <Link
              key={archive.seasonId}
              href={`/history?season=${archive.seasonId}`}
              className={activeSeason === archive.seasonId ? styles.activeSelector : undefined}
            >
              {compactSeasonName(archive.seasonName)}
            </Link>
          ))}
        </nav>

        {selectedArchive ? <SeasonView archive={selectedArchive} /> : <OverallView archives={archives} />}
      </main>
      <Footer />
    </>
  );
}

function OverallView({archives}: {archives: HistoricalSeasonArchive[]}) {
  const allTimeTeams = getAllTimeTeamRows(archives);

  return (
    <div className={styles.viewStack}>
      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <span className="eyebrow">Championship history</span>
            <h2>League timeline</h2>
          </div>
          <p>Select a season for its standings, playoff path and season summary.</p>
        </div>

        <div className={styles.timeline}>
          {archives.map((archive) => {
            const championship = (PLAYOFFS_BY_SEASON[archive.seasonId] ?? [])
              .find((match) => match.round === 'Championship');

            return (
              <article className={styles.timelineCard} key={archive.seasonId}>
                <div className={styles.timelineSeason}>{compactSeasonName(archive.seasonName)}</div>
                <div className={styles.timelineChampion}>
                  <span>Champion</span>
                  {archive.championTeamId && archive.championTeamName ? (
                    <Link href={`/teams/${archive.championTeamId}`}>{archive.championTeamName}</Link>
                  ) : <strong>Not recorded</strong>}
                </div>
                {championship ? (
                  <div className={styles.championshipRecap}>
                    <span>Championship</span>
                    <strong>{championship.homeTeamName} {championship.homeScore}–{championship.awayScore} {championship.awayTeamName}</strong>
                  </div>
                ) : (
                  <div className={styles.championshipRecap}>
                    <span>Season record</span>
                    <strong>Detailed postseason archive to be added</strong>
                  </div>
                )}
                <Link className={styles.textLink} href={`/history?season=${archive.seasonId}`}>Open season →</Link>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <span className="eyebrow">Team history</span>
            <h2>League record book</h2>
          </div>
          <p>Championships and regular-season team records. Detailed team history remains on each team page.</p>
        </div>
        <div className={styles.tablePanel}>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr><th>Team</th><th>Championships</th><th>Regular-season record</th></tr>
              </thead>
              <tbody>
                {allTimeTeams.map((team) => (
                  <tr key={team.teamId}>
                    <td><Link href={`/teams/${team.teamId}`}>{team.teamName}</Link></td>
                    <td><strong>{team.titles}</strong></td>
                    <td>{formatRecord(team)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <ExploreRecords />
    </div>
  );
}

function SeasonView({archive}: {archive: HistoricalSeasonArchive}) {
  const playoffs = PLAYOFFS_BY_SEASON[archive.seasonId] ?? [];
  const championship = playoffs.find((match) => match.round === 'Championship');

  return (
    <div className={styles.viewStack}>
      <section className={styles.championHero}>
        <div>
          <span>{compactSeasonName(archive.seasonName)}</span>
          <small>Season champion</small>
          {archive.championTeamId && archive.championTeamName ? (
            <Link href={`/teams/${archive.championTeamId}`}>{archive.championTeamName}</Link>
          ) : <strong>Champion not recorded</strong>}
        </div>
      </section>

      <section className={styles.seasonGrid}>
        <div className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <span className="eyebrow">Final table</span>
              <h2>Standings</h2>
            </div>
          </div>
          <StandingsTable standings={archive.standings} />
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeading}>
            <div>
              <span className="eyebrow">Postseason</span>
              <h2>Playoffs</h2>
            </div>
          </div>
          {playoffs.length ? (
            <div className={styles.playoffStack}>
              {playoffs.map((match) => <PlayoffCard key={match.label} match={match} />)}
            </div>
          ) : (
            <div className={styles.emptyPanel}>
              <strong>{archive.championTeamName ?? 'Champion'} is preserved as season champion.</strong>
              <p>The detailed postseason scores are not yet loaded into this archive, so no matchup results are being inferred.</p>
            </div>
          )}
        </div>
      </section>

      <section className={styles.seasonSummary}>
        <div>
          <span className="eyebrow">Season summary</span>
          <h2>{archive.championTeamName ?? 'Season'} finished on top.</h2>
          <p>
            {championship
              ? `${championship.homeTeamName} defeated ${championship.awayTeamName} ${championship.homeScore}–${championship.awayScore} in the championship match.`
              : 'This page preserves the league result and final standings while player rankings and career statistics remain in their dedicated areas.'}
          </p>
        </div>
      </section>

      <ExploreRecords
        seasonName={compactSeasonName(archive.seasonName)}
        archiveUrl={SEASON_ARCHIVE_URLS[archive.seasonId]}
      />
    </div>
  );
}

function ExploreRecords({seasonName, archiveUrl}: {seasonName?: string; archiveUrl?: string}) {
  return (
    <section className={styles.archiveLinks}>
      <div>
        <strong>{seasonName ? `Explore ${seasonName}` : 'Explore the records'}</strong>
        <span>History preserves league outcomes. Rankings and player pages hold the detailed individual numbers.</span>
      </div>
      <div className={styles.linkActions}>
        <Link href="/rankings">Stats & rankings →</Link>
        <Link href="/players">Player records →</Link>
        <Link href="/teams">Team history →</Link>
        {archiveUrl ? (
          <a href={archiveUrl} target="_blank" rel="noreferrer">Full match archive →</a>
        ) : null}
      </div>
    </section>
  );
}

function StandingsTable({standings}: {standings: HistoricalTeamSeasonStanding[]}) {
  return (
    <div className={styles.tablePanel}>
      <div className={styles.tableWrap}>
        <table>
          <thead><tr><th>#</th><th>Team</th><th>Record</th><th>Pts %</th></tr></thead>
          <tbody>
            {standings.map((standing) => (
              <tr key={standing.teamId}>
                <td><strong>{standing.rank}</strong></td>
                <td><Link href={`/teams/${standing.teamId}`}>{standing.teamName}</Link></td>
                <td>{formatRecord(standing.record)}</td>
                <td>{standing.pointsPercentage.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PlayoffCard({match}: {match: PlayoffMatch}) {
  const awayWon = match.awayScore > match.homeScore;
  const homeWon = match.homeScore > match.awayScore;

  return (
    <article className={match.round === 'Championship' ? styles.championshipMatch : styles.playoffMatch}>
      <span>{match.label}</span>
      <div className={awayWon ? styles.winner : undefined}>
        <Link href={`/teams/${match.awayTeamId}`}>{match.awayTeamName}</Link>
        <strong>{match.awayScore}</strong>
      </div>
      <div className={homeWon ? styles.winner : undefined}>
        <Link href={`/teams/${match.homeTeamId}`}>{match.homeTeamName}</Link>
        <strong>{match.homeScore}</strong>
      </div>
    </article>
  );
}
