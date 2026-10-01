import {createServerTeamPageServices} from '@/core/createServerTeamPageServices';
import type {TeamStatistics} from '@/services/statistics/StatisticsTypes';
import styles from './MatchTeamStats.module.css';

type TeamIdentity = {
  id: string;
  name: string;
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
  let statistics: TeamStatistics[];
  try {
    const services = await createServerTeamPageServices();
    if (!services) return null;
    statistics = await services.statistics.getTeamStatisticsForTeams(
      [awayTeam.id, homeTeam.id],
      seasonId,
    );
  } catch (error) {
    console.error('Matchday team statistics are unavailable.', {
      seasonId,
      teamIds: [awayTeam.id, homeTeam.id],
      errorClass: error instanceof Error ? error.name : 'UnknownError',
    });
    return null;
  }

  const byTeam = new Map(statistics.map((entry) => [entry.teamId, entry]));

  return (
    <section className={styles.section} aria-labelledby="match-team-stats-heading">
      <header className={styles.header}>
        <span>Season performance</span>
        <h2 id="match-team-stats-heading">Team stats</h2>
        <p>Each team’s published season results. No matchup prediction.</p>
      </header>

      <div className={styles.grid}>
        <TeamStatCard team={awayTeam} stats={byTeam.get(awayTeam.id)} side="away" />
        <TeamStatCard team={homeTeam} stats={byTeam.get(homeTeam.id)} side="home" />
      </div>
    </section>
  );
}

function TeamStatCard({
  team,
  stats,
  side,
}: {
  team: TeamIdentity;
  stats: TeamStatistics | undefined;
  side: 'away' | 'home';
}) {
  if (!stats?.matchesPlayed) {
    return (
      <article className={styles.teamCard} data-side={side}>
        <div className={styles.teamHeader}>
          <span>{side === 'away' ? 'Away' : 'Home'}</span>
          <strong>{team.name}</strong>
        </div>
        <p className={styles.empty}>No completed season matches yet.</p>
      </article>
    );
  }

  return (
    <article className={styles.teamCard} data-side={side}>
      <div className={styles.teamHeader}>
        <span>{side === 'away' ? 'Away' : 'Home'}</span>
        <strong>{team.name}</strong>
      </div>

      <dl className={styles.stats}>
        <Stat label="Record" value={formatRecord(stats)} />
        <Stat label="Season points %" value={`${stats.pointsPercentage.toFixed(1)}%`} />
        <Stat label="Point differential" value={formatDifferential(stats.pointDifferential)} />
        <Stat label="Streak" value={stats.currentStreak || '—'} />
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

function formatRecord(stats: TeamStatistics) {
  const {wins, losses, ties} = stats.record;
  return ties ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}

function formatDifferential(value: number) {
  return value > 0 ? `+${value}` : String(value);
}
