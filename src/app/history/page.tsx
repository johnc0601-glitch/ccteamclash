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

function compactSeasonName(name: string): string {
  return name.replace(/^Coastal Clash Match Play\s*/i, '').replace(/(\d{4})-(\d{4})/, '$1–$2');
}

function formatRecord(record: {wins: number; losses: number; ties: number}): string {
  return record.ties ? `${record.wins}-${record.losses}-${record.ties}` : `${record.wins}-${record.losses}`;
}

function getRegularSeasonMatchCount(standings: HistoricalTeamSeasonStanding[]): number {
  return Math.round(standings.reduce((total, team) => total + team.matchesPlayed, 0) / 2);
}

function getAllTimeTeamRows(archives: HistoricalSeasonArchive[]) {
  const rows = new Map<string, {
    teamId: string;
    teamName: string;
    titles: number;
    seasons: number;
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
        seasons: 0,
        wins: 0,
        losses: 0,
        ties: 0,
      };

      existing.seasons += 1;
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
          <p>Champions, final standings and postseason results across Coastal Clash seasons.</p>
        </header>

        <nav className={styles.seasonSelector} aria-label="History season">
          <Link
            href="/history"
            className={activeSeason === 'overall' ? styles.activeSelector : undefined}
          >
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
  const uniqueTeams = new Set(archives.flatMap((archive) => archive.standings.map((team) => team.teamId))).size;
  const regularSeasonMatches = archives.reduce((total, archive) => total + getRegularSeasonMatchCount(archive.standings), 0);
  const knownPlayoffMatches = Object.values(PLAYOFFS_BY_SEASON).reduce((total, matches) => total + matches.length, 0);

  return (
    <div className={styles.viewStack}>
      <section className={styles.statGrid} aria-label="League totals">
        <Stat value={archives.length} label="Seasons" />
        <Stat value={uniqueTeams} label="Teams" />
        <Stat value={archives.length} label="Championships" />
        <Stat value={regularSeasonMatches + knownPlayoffMatches} label="Recorded team matches" />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <span className="eyebrow">By season</span>
            <h2>League timeline</h2>
          </div>
        </div>

        <div className={styles.timeline}>
          {archives.map((archive) => (
            <article className={styles.timelineCard} key={archive.seasonId}>
              <div className={styles.timelineSeason}>{compactSeasonName(archive.seasonName)}</div>
              <div className={styles.timelineChampion}>
                <span>Champion</span>
                {archive.championTeamId && archive.championTeamName ? (
                  <Link href={`/teams/${archive.championTeamId}`}>{archive.championTeamName}</Link>
                ) : <strong>Not recorded</strong>}
              </div>
              <div className={styles.podium}>
                {archive.standings.slice(0, 3).map((standing) => (
                  <div key={standing.teamId}>
                    <span>{standing.rank}</span>
                    <Link href={`/teams/${standing.teamId}`}>{standing.teamName}</Link>
                    <small>{formatRecord(standing.record)}</small>
                  </div>
                ))}
              </div>
              <Link className={styles.textLink} href={`/history?season=${archive.seasonId}`}>View season →</Link>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeading}>
          <div>
            <span className="eyebrow">Record book</span>
            <h2>All-time teams</h2>
          </div>
          <p>Regular-season records with championships shown separately.</p>
        </div>
        <div className={styles.tablePanel}>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr><th>Team</th><th>Titles</th><th>Seasons</th><th>Record</th></tr>
              </thead>
              <tbody>
                {allTimeTeams.map((team) => (
                  <tr key={team.teamId}>
                    <td><Link href={`/teams/${team.teamId}`}>{team.teamName}</Link></td>
                    <td><strong>{team.titles}</strong></td>
                    <td>{team.seasons}</td>
                    <td>{formatRecord(team)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={styles.archiveLinks}>
        <div>
          <strong>Looking for individual history?</strong>
          <span>Team and player career detail stays on the existing record pages.</span>
        </div>
        <div className={styles.linkActions}>
          <Link href="/teams">Team history →</Link>
          <Link href="/players">Player history →</Link>
        </div>
      </section>
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
        <div className={styles.heroMeta}>
          <div><strong>{archive.standings.length}</strong><span>Teams</span></div>
          <div><strong>{getRegularSeasonMatchCount(archive.standings)}</strong><span>Regular-season matches</span></div>
          <div><strong>{playoffs.length || '—'}</strong><span>Postseason matches</span></div>
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
              <strong>Champion recorded</strong>
              <p>The detailed semifinal and championship scores for this season are not yet loaded into the league archive.</p>
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
              : 'The league champion is preserved here while individual team and player records remain on their dedicated pages.'}
          </p>
        </div>
        <div className={styles.linkActions}>
          <Link href="/teams">Browse teams →</Link>
          <Link href="/players">Browse players →</Link>
        </div>
      </section>
    </div>
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

function Stat({value, label}: {value: string | number; label: string}) {
  return <div className={styles.stat}><strong>{value}</strong><span>{label}</span></div>;
}
