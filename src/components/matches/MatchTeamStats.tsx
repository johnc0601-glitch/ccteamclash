import {createServerTeamPageServices} from '@/core/createServerTeamPageServices';
import {createClient} from '@/lib/supabase/server';
import type {TeamFormatStatistics, TeamStatistics} from '@/services/statistics/StatisticsTypes';
import styles from './MatchTeamStats.module.css';

type TeamIdentity = {
  id: string;
  name: string;
};

type SeasonSummary = {
  id: string;
  name: string;
  start_date: string;
};

export async function MatchTeamStats({
  awayTeam,
  homeTeam,
  seasonId,
}: {
  awayTeam: TeamIdentity;
  homeTeam: TeamIdentity;
  seasonId: string;
}) {
  try {
    const [services, previousSeason] = await Promise.all([
      createServerTeamPageServices(),
      getPreviousSeason(seasonId),
    ]);
    if (!services) return null;

    const snapshot = await services.statistics.getMatchdayTeamStatisticsForTeams(
      [awayTeam.id, homeTeam.id],
      seasonId,
      previousSeason?.id,
    );

    const currentByTeam = new Map(snapshot.current.map((entry) => [entry.teamId, entry]));
    const previousByTeam = new Map(snapshot.previousFormats.map((entry) => [entry.teamId, entry]));

    return (
      <section className={styles.section} aria-labelledby="match-team-stats-heading">
        <header className={styles.header}>
          <span>Season performance</span>
          <h2 id="match-team-stats-heading">Team stats</h2>
          <p>Current season results plus last season’s team singles and doubles win rates.</p>
        </header>

        <div className={styles.grid}>
          <TeamStatCard
            team={awayTeam}
            stats={currentByTeam.get(awayTeam.id)}
            previous={previousByTeam.get(awayTeam.id)}
            previousLabel={previousSeason ? compactSeasonName(previousSeason.name) : 'Last season'}
            side="away"
          />
          <TeamStatCard
            team={homeTeam}
            stats={currentByTeam.get(homeTeam.id)}
            previous={previousByTeam.get(homeTeam.id)}
            previousLabel={previousSeason ? compactSeasonName(previousSeason.name) : 'Last season'}
            side="home"
          />
        </div>
      </section>
    );
  } catch (error) {
    console.error('Matchday team statistics are unavailable.', {
      seasonId,
      teamIds: [awayTeam.id, homeTeam.id],
      errorClass: error instanceof Error ? error.name : 'UnknownError',
    });
    return null;
  }
}

function TeamStatCard({
  team,
  stats,
  previous,
  previousLabel,
  side,
}: {
  team: TeamIdentity;
  stats: TeamStatistics | undefined;
  previous: TeamFormatStatistics | undefined;
  previousLabel: string;
  side: 'away' | 'home';
}) {
  return (
    <article className={styles.teamCard} data-side={side}>
      <div className={styles.teamHeader}>
        <span>{side === 'away' ? 'Away' : 'Home'}</span>
        <strong>{team.name}</strong>
      </div>

      <div className={styles.currentLabel}>Current season</div>
      <dl className={styles.stats}>
        <Stat label="Record" value={stats?.matchesPlayed ? formatRecord(stats) : '—'} />
        <Stat label="Point diff." value={stats?.matchesPlayed ? formatDifferential(stats.pointDifferential) : '—'} />
        <Stat label="Streak" value={stats?.matchesPlayed ? stats.currentStreak || '—' : '—'} />
      </dl>

      <div className={styles.historyLabel}>{previousLabel}</div>
      <dl className={styles.historical}>
        <Stat
          label="Singles win %"
          value={hasResults(previous?.singlesRecord) ? formatPercentage(previous?.singlesWinPercentage) : '—'}
        />
        <Stat
          label="Doubles win %"
          value={hasResults(previous?.doublesRecord) ? formatPercentage(previous?.doublesWinPercentage) : '—'}
        />
      </dl>
    </article>
  );
}

function Stat({label, value}: {label: string; value: string}) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

async function getPreviousSeason(currentSeasonId: string): Promise<SeasonSummary | undefined> {
  const supabase = await createClient();
  const {data, error} = await supabase
    .from('launch_seasons')
    .select('id,name,start_date')
    .order('start_date', {ascending: false});
  if (error) throw error;

  const seasons = (data ?? []) as SeasonSummary[];
  const currentIndex = seasons.findIndex((season) => season.id === currentSeasonId);
  return currentIndex >= 0 ? seasons[currentIndex + 1] : undefined;
}

function compactSeasonName(name: string) {
  const match = name.match(/(20\d{2})\D+(20\d{2})/);
  if (!match) return name;
  return `${match[1]}–${match[2].slice(-2)}`;
}

function hasResults(record: {wins: number; losses: number; ties: number} | undefined) {
  return Boolean(record && record.wins + record.losses + record.ties > 0);
}

function formatPercentage(value: number | undefined) {
  return value === undefined ? '—' : `${value.toFixed(1)}%`;
}

function formatRecord(stats: TeamStatistics) {
  const {wins, losses, ties} = stats.record;
  return ties ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

function formatDifferential(value: number) {
  return value > 0 ? `+${value}` : String(value);
}
