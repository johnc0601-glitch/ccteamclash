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
  round: 'Semifinal' | 'Third Place' | 'Championship';
  label: string;
  awayTeamId: string;
  awayTeamName: string;
  awayScore: number;
  homeTeamId: string;
  homeTeamName: string;
  homeScore: number;
};

type SeasonResultMatch = {
  awayTeamId: string;
  awayTeamName: string;
  awayScore: number;
  homeTeamId: string;
  homeTeamName: string;
  homeScore: number;
};

type SeasonResultGroup = {
  label: string;
  sublabel?: string;
  matches: SeasonResultMatch[];
};

const PLAYOFFS_BY_SEASON: Record<string, PlayoffMatch[]> = {
  'coastal-clash-2024-2025': [
    {round: 'Semifinal', label: 'Semifinal 1', awayTeamId: 'hayneous-og-s', awayTeamName: "Hayneous OG's", awayScore: 6, homeTeamId: 'dark-knights', homeTeamName: 'Dark Knights', homeScore: 13},
    {round: 'Semifinal', label: 'Semifinal 2', awayTeamId: 'kb', awayTeamName: 'KB', awayScore: 7, homeTeamId: 'cougar-country', homeTeamName: 'Cougar Country', homeScore: 10},
    {round: 'Championship', label: 'Championship', awayTeamId: 'cougar-country', awayTeamName: 'Cougar Country', awayScore: 5, homeTeamId: 'dark-knights', homeTeamName: 'Dark Knights', homeScore: 12},
  ],
  'coastal-clash-2025-2026': [
    {round: 'Semifinal', label: 'Semifinal 1', awayTeamId: 'kb', awayTeamName: 'KB', awayScore: 5.5, homeTeamId: 'beast-mode', homeTeamName: 'Beast Mode', homeScore: 12.5},
    {round: 'Semifinal', label: 'Semifinal 2', awayTeamId: 'riptide', awayTeamName: 'Riptide', awayScore: 12.5, homeTeamId: 'ninjas', homeTeamName: 'Ninjas', homeScore: 5.5},
    {round: 'Third Place', label: '3rd Place', awayTeamId: 'kb', awayTeamName: 'KB', awayScore: 7, homeTeamId: 'ninjas', homeTeamName: 'Ninjas', homeScore: 12},
    {round: 'Championship', label: 'Championship', awayTeamId: 'riptide', awayTeamName: 'Riptide', awayScore: 12, homeTeamId: 'beast-mode', homeTeamName: 'Beast Mode', homeScore: 7},
  ],
};

const SEASON_RESULTS_BY_SEASON: Record<string, SeasonResultGroup[]> = {
  'coastal-clash-2025-2026': [
    {
      label: 'Oct 4th',
      matches: [
        {awayTeamId: 'dark-knights', awayTeamName: 'Dark Knights', awayScore: 12, homeTeamId: 'kb', homeTeamName: 'KB', homeScore: 21},
        {awayTeamId: 'riptide', awayTeamName: 'Riptide', awayScore: 24, homeTeamId: 'cougar-country', homeTeamName: 'Cougar Country', homeScore: 12},
        {awayTeamId: 'wild-turkey', awayTeamName: 'Wild Turkey', awayScore: 13, homeTeamId: 'beast-mode', homeTeamName: 'Beast Mode', homeScore: 23},
        {awayTeamId: 'ninjas', awayTeamName: 'Ninjas', awayScore: 21.5, homeTeamId: 'hayneous-og-s', homeTeamName: "Hayneous OG's", homeScore: 18.5},
      ],
    },
    {
      label: 'Nov 1st',
      matches: [
        {awayTeamId: 'kb', awayTeamName: 'KB', awayScore: 21.5, homeTeamId: 'wild-turkey', homeTeamName: 'Wild Turkey', homeScore: 9},
        {awayTeamId: 'beast-mode', awayTeamName: 'Beast Mode', awayScore: 16, homeTeamId: 'hayneous-og-s', homeTeamName: "Hayneous OG's", homeScore: 15.5},
        {awayTeamId: 'cougar-country', awayTeamName: 'Cougar Country', awayScore: 16, homeTeamId: 'ninjas', homeTeamName: 'Ninjas', homeScore: 20},
        {awayTeamId: 'dark-knights', awayTeamName: 'Dark Knights', awayScore: 13, homeTeamId: 'riptide', homeTeamName: 'Riptide', homeScore: 23},
      ],
    },
    {
      label: 'Dec 6th',
      matches: [
        {awayTeamId: 'cougar-country', awayTeamName: 'Cougar Country', awayScore: 14.5, homeTeamId: 'dark-knights', homeTeamName: 'Dark Knights', homeScore: 21.5},
        {awayTeamId: 'riptide', awayTeamName: 'Riptide', awayScore: 23, homeTeamId: 'beast-mode', homeTeamName: 'Beast Mode', homeScore: 17},
        {awayTeamId: 'hayneous-og-s', awayTeamName: "Hayneous OG's", awayScore: 20.5, homeTeamId: 'wild-turkey', homeTeamName: 'Wild Turkey', homeScore: 16.5},
        {awayTeamId: 'kb', awayTeamName: 'KB', awayScore: 19.5, homeTeamId: 'ninjas', homeTeamName: 'Ninjas', homeScore: 16.5},
      ],
    },
    {
      label: 'Jan 3rd',
      matches: [
        {awayTeamId: 'hayneous-og-s', awayTeamName: "Hayneous OG's", awayScore: 12, homeTeamId: 'cougar-country', homeTeamName: 'Cougar Country', homeScore: 24},
        {awayTeamId: 'beast-mode', awayTeamName: 'Beast Mode', awayScore: 17, homeTeamId: 'kb', homeTeamName: 'KB', homeScore: 21},
        {awayTeamId: 'ninjas', awayTeamName: 'Ninjas', awayScore: 10.5, homeTeamId: 'riptide', homeTeamName: 'Riptide', homeScore: 25.5},
        {awayTeamId: 'wild-turkey', awayTeamName: 'Wild Turkey', awayScore: 15.5, homeTeamId: 'dark-knights', homeTeamName: 'Dark Knights', homeScore: 20.5},
      ],
    },
    {
      label: 'March 7th',
      sublabel: 'Playoffs',
      matches: [
        {awayTeamId: 'kb', awayTeamName: 'KB', awayScore: 5.5, homeTeamId: 'beast-mode', homeTeamName: 'Beast Mode', homeScore: 12.5},
        {awayTeamId: 'riptide', awayTeamName: 'Riptide', awayScore: 12.5, homeTeamId: 'ninjas', homeTeamName: 'Ninjas', homeScore: 5.5},
        {awayTeamId: 'kb', awayTeamName: 'KB', awayScore: 7, homeTeamId: 'ninjas', homeTeamName: 'Ninjas', homeScore: 12},
        {awayTeamId: 'riptide', awayTeamName: 'Riptide', awayScore: 12, homeTeamId: 'beast-mode', homeTeamName: 'Beast Mode', homeScore: 7},
      ],
    },
  ],
};

// Add a public spreadsheet/archive URL here when a season source is ready.
const SEASON_ARCHIVE_URLS: Partial<Record<string, string>> = {};

function compactSeasonName(name: string): string {
  const withoutLeagueName = name.replace(/^Coastal Clash Match Play\s*/i, '');
  return withoutLeagueName.replace(/(\d{4})-(\d{4})/, (_match, firstYear: string, secondYear: string) => `${firstYear}–${secondYear.slice(2)}`);
}

function formatRecord(record: {wins: number; losses: number; ties: number}): string {
  return record.ties ? `${record.wins}-${record.losses}-${record.ties}` : `${record.wins}-${record.losses}`;
}

function getAllTimeTeamRows(archives: HistoricalSeasonArchive[]) {
  const rows = new Map<string, {teamId: string; teamName: string; titles: number; wins: number; losses: number; ties: number}>();
  for (const archive of archives) {
    for (const standing of archive.standings) {
      const existing = rows.get(standing.teamId) ?? {teamId: standing.teamId, teamName: standing.teamName, titles: 0, wins: 0, losses: 0, ties: 0};
      existing.wins += standing.record.wins;
      existing.losses += standing.record.losses;
      existing.ties += standing.record.ties;
      if (archive.championTeamId === standing.teamId) existing.titles += 1;
      rows.set(standing.teamId, existing);
    }
  }
  return Array.from(rows.values()).sort((first, second) => second.titles - first.titles || second.wins - first.wins || first.losses - second.losses || first.teamName.localeCompare(second.teamName));
}

export default async function HistoryPage({searchParams}: HistoryProps) {
  const archives = getHistoricalSeasonArchives();
  const query = await searchParams;
  const requestedSeason = Array.isArray(query.season) ? query.season[0] : query.season;
  const selectedArchive = archives.find((archive) => archive.seasonId === requestedSeason);
  const activeSeason = selectedArchive?.seasonId ?? 'overall';

  return <>
    <SiteHeader />
    <main className={`shell page-shell ${styles.page}`}>
      <header className={styles.pageHeader}>
        <span className="eyebrow">League archive</span>
        <h1>History</h1>
        <p>Champions, postseason results, final standings and the season-by-season story of Coastal Clash.</p>
      </header>
      <nav className={styles.seasonSelector} aria-label="History season">
        <Link href="/history" className={activeSeason === 'overall' ? styles.activeSelector : undefined}>Overall</Link>
        {archives.map((archive) => <Link key={archive.seasonId} href={`/history?season=${archive.seasonId}`} className={activeSeason === archive.seasonId ? styles.activeSelector : undefined}>{compactSeasonName(archive.seasonName)}</Link>)}
      </nav>
      {selectedArchive ? <SeasonView archive={selectedArchive} /> : <OverallView archives={archives} />}
    </main>
    <Footer />
  </>;
}

function OverallView({archives}: {archives: HistoricalSeasonArchive[]}) {
  const allTimeTeams = getAllTimeTeamRows(archives);
  return <div className={styles.viewStack}>
    <section className={styles.section}>
      <div className={styles.sectionHeading}><div><span className="eyebrow">Championship history</span><h2>League timeline</h2></div><p>Select a season for its standings, playoff path and season summary.</p></div>
      <div className={styles.timeline}>{archives.map((archive) => {
        const championship = (PLAYOFFS_BY_SEASON[archive.seasonId] ?? []).find((match) => match.round === 'Championship');
        return <article className={styles.timelineCard} key={archive.seasonId}>
          <div className={styles.timelineSeason}>{compactSeasonName(archive.seasonName)}</div>
          <div className={styles.timelineChampion}><span>Champion</span>{archive.championTeamId && archive.championTeamName ? <Link href={`/teams/${archive.championTeamId}`}>{archive.championTeamName}</Link> : <strong>Not recorded</strong>}</div>
          {championship ? <div className={styles.championshipRecap}><span>Championship</span><strong>{championship.homeTeamName} {championship.homeScore}–{championship.awayScore} {championship.awayTeamName}</strong></div> : <div className={styles.championshipRecap}><span>Season record</span><strong>Detailed postseason archive to be added</strong></div>}
          <Link className={styles.textLink} href={`/history?season=${archive.seasonId}`}>Open season →</Link>
        </article>;
      })}</div>
    </section>
    <section className={styles.section}>
      <div className={styles.sectionHeading}><div><span className="eyebrow">Team history</span><h2>League record book</h2></div><p>Championships and regular-season team records. Detailed team history remains on each team page.</p></div>
      <div className={styles.tablePanel}><div className={styles.tableWrap}><table><thead><tr><th>Team</th><th>Championships</th><th>Regular-season record</th></tr></thead><tbody>{allTimeTeams.map((team) => <tr key={team.teamId}><td><Link href={`/teams/${team.teamId}`}>{team.teamName}</Link></td><td><strong>{team.titles}</strong></td><td>{formatRecord(team)}</td></tr>)}</tbody></table></div></div>
    </section>
    <ExploreRecords />
  </div>;
}

function SeasonView({archive}: {archive: HistoricalSeasonArchive}) {
  const playoffs = PLAYOFFS_BY_SEASON[archive.seasonId] ?? [];
  const championship = playoffs.find((match) => match.round === 'Championship');
  const seasonResults = SEASON_RESULTS_BY_SEASON[archive.seasonId] ?? [];
  return <div className={styles.viewStack}>
    <section className={styles.championHero}><div><span>{compactSeasonName(archive.seasonName)}</span><small>Season champion</small>{archive.championTeamId && archive.championTeamName ? <Link href={`/teams/${archive.championTeamId}`}>{archive.championTeamName}</Link> : <strong>Champion not recorded</strong>}</div></section>
    <section className={styles.seasonGrid}>
      <div className={styles.section}><div className={styles.sectionHeading}><div><span className="eyebrow">Final table</span><h2>Standings</h2></div></div><StandingsTable standings={archive.standings} /></div>
      <div className={styles.section}><div className={styles.sectionHeading}><div><span className="eyebrow">Postseason</span><h2>Playoffs</h2></div></div>{playoffs.length ? <div className={styles.playoffStack}>{playoffs.map((match) => <PlayoffCard key={match.label} match={match} />)}</div> : <div className={styles.emptyPanel}><strong>{archive.championTeamName ?? 'Champion'} is preserved as season champion.</strong><p>The detailed postseason scores are not yet loaded into this archive, so no matchup results are being inferred.</p></div>}</div>
    </section>
    <section className={styles.seasonSummary}><div><span className="eyebrow">Season summary</span><h2>{archive.championTeamName ?? 'Season'} finished on top.</h2><p>{championship ? `${championship.awayScore > championship.homeScore ? championship.awayTeamName : championship.homeTeamName} defeated ${championship.awayScore > championship.homeScore ? championship.homeTeamName : championship.awayTeamName} ${Math.max(championship.awayScore, championship.homeScore)}–${Math.min(championship.awayScore, championship.homeScore)} in the championship match.` : 'This page preserves the league result and final standings while detailed player statistics and Clash Index remain in Stats.'}</p></div></section>
    {seasonResults.length ? <SeasonResultsBoard seasonName={compactSeasonName(archive.seasonName)} groups={seasonResults} seasonId={archive.seasonId} /> : <ExploreRecords seasonName={compactSeasonName(archive.seasonName)} seasonId={archive.seasonId} archiveUrl={SEASON_ARCHIVE_URLS[archive.seasonId]} />}
  </div>;
}

function ExploreRecords({seasonName, seasonId, archiveUrl}: {seasonName?: string; seasonId?: string; archiveUrl?: string}) {
  const statsHref = seasonId ? `/stats?season=${seasonId}` : '/stats';
  return <section className={styles.archiveLinks}><div><strong>{seasonName ? `Explore ${seasonName}` : 'Explore the records'}</strong><span>History preserves league outcomes. Stats holds detailed player numbers, current season order, and Clash Index.</span></div><div className={styles.linkActions}><Link href={statsHref}>Stats →</Link><Link href="/players">Player records →</Link><Link href="/teams">Team history →</Link>{archiveUrl ? <a href={archiveUrl} target="_blank" rel="noreferrer">Full match archive →</a> : null}</div></section>;
}

function SeasonResultsBoard({seasonName, groups, seasonId}: {seasonName: string; groups: SeasonResultGroup[]; seasonId: string}) {
  return <section className={styles.section}>
    <div className={styles.sectionHeading}><div><span className="eyebrow">Season results</span><h2>{seasonName}</h2></div><p>Completed match results, arranged like the season sheet without the team-by-team scheduling panel.</p></div>
    <div style={{maxWidth: 620}}>
      <div className={styles.tablePanel}>
        <div style={{padding: '13px 16px', background: '#0b0d0e', color: '#fff', fontSize: 12, fontWeight: 950, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '.04em'}}>{seasonName} Coastal Clash Results</div>
        {groups.map((group) => <div key={`${seasonId}-${group.label}-${group.sublabel ?? ''}`} style={{borderTop: '1px solid var(--cc-card-border)'}}>
          <div style={{padding: '8px 12px', display: 'flex', justifyContent: 'center', gap: 8, background: 'var(--cc-card-bg-soft)', color: 'var(--cc-heading)', fontSize: 11, fontWeight: 950}}>
            <span>{group.label}</span>{group.sublabel ? <span style={{color: 'var(--cc-bronze)', textTransform: 'uppercase'}}>{group.sublabel}</span> : null}
          </div>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 104px 1fr', padding: '6px 12px', borderTop: '1px solid var(--cc-card-border)', borderBottom: '1px solid var(--cc-card-border)', color: 'var(--cc-muted)', fontSize: 9, fontWeight: 950, textTransform: 'uppercase'}}>
            <span style={{textAlign: 'center'}}>Away</span><span></span><span style={{textAlign: 'center'}}>Home</span>
          </div>
          {group.matches.map((match, index) => {
            const awayWon = match.awayScore > match.homeScore;
            const homeWon = match.homeScore > match.awayScore;
            return <div key={`${group.label}-${index}-${match.awayTeamId}-${match.homeTeamId}`} style={{display: 'grid', gridTemplateColumns: '1fr 104px 1fr', alignItems: 'center', minHeight: 34, padding: '0 12px', borderBottom: index === group.matches.length - 1 ? undefined : '1px solid var(--cc-card-border)', background: 'var(--cc-card-bg)'}}>
              <Link href={`/teams/${match.awayTeamId}`} style={{color: awayWon ? 'var(--cc-bronze)' : 'var(--cc-heading)', fontSize: 11, fontWeight: awayWon ? 950 : 800, textAlign: 'center'}}>{match.awayTeamName}</Link>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 24px 1fr', alignItems: 'center', color: 'var(--cc-heading)', fontSize: 11, textAlign: 'center'}}>
                <strong style={{color: awayWon ? 'var(--cc-bronze)' : 'var(--cc-heading)'}}>{match.awayScore}</strong><span style={{color: 'var(--cc-muted)', fontSize: 9}}>@</span><strong style={{color: homeWon ? 'var(--cc-bronze)' : 'var(--cc-heading)'}}>{match.homeScore}</strong>
              </div>
              <Link href={`/teams/${match.homeTeamId}`} style={{color: homeWon ? 'var(--cc-bronze)' : 'var(--cc-heading)', fontSize: 11, fontWeight: homeWon ? 950 : 800, textAlign: 'center'}}>{match.homeTeamName}</Link>
            </div>;
          })}
        </div>)}
      </div>
      <div className={styles.linkActions} style={{marginTop: 14}}><Link href={`/stats?season=${seasonId}`}>Stats →</Link><Link href="/players">Player records →</Link><Link href="/teams">Team history →</Link></div>
    </div>
  </section>;
}

function StandingsTable({standings}: {standings: HistoricalTeamSeasonStanding[]}) {
  return <div className={styles.tablePanel}><div className={styles.tableWrap}><table><thead><tr><th>#</th><th>Team</th><th>Record</th><th>Pts %</th></tr></thead><tbody>{standings.map((standing) => <tr key={standing.teamId}><td><strong>{standing.rank}</strong></td><td><Link href={`/teams/${standing.teamId}`}>{standing.teamName}</Link></td><td>{formatRecord(standing.record)}</td><td>{standing.pointsPercentage.toFixed(1)}%</td></tr>)}</tbody></table></div></div>;
}

function PlayoffCard({match}: {match: PlayoffMatch}) {
  const awayWon = match.awayScore > match.homeScore;
  const homeWon = match.homeScore > match.awayScore;
  return <article className={match.round === 'Championship' ? styles.championshipMatch : styles.playoffMatch}><span>{match.label}</span><div className={awayWon ? styles.winner : undefined}><Link href={`/teams/${match.awayTeamId}`}>{match.awayTeamName}</Link><strong>{match.awayScore}</strong></div><div className={homeWon ? styles.winner : undefined}><Link href={`/teams/${match.homeTeamId}`}>{match.homeTeamName}</Link><strong>{match.homeScore}</strong></div></article>;
}
