import {createServerTeamPageServices} from '@/core/createServerTeamPageServices';
import {loadServerHistoricalTeamFormatStats} from '@/core/loadServerHistoricalTeamFormatStats';
import {createHistoricalStatsReadClient} from '@/core/createHistoricalStatsReadClient';
import type {TeamFormatStatistics, TeamStatistics} from '@/services/statistics/StatisticsTypes';
import styles from './MatchTeamStats.module.css';

type TeamIdentity = {
  id: string;
  name: string;
};

type PreviousSeason = {
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
  try {
    const [services, previousSeason] = await Promise.all([
      createServerTeamPageServices(),
      getPreviousSeason(seasonId),
    ]);
    if (!services) return null;

    const teamIds = [awayTeam.id, homeTeam.id];
    const [currentStatistics, previousByTeam] = await Promise.all([
      services.statistics.getTeamStatisticsForTeams(teamIds, seasonId),
      previousSeason
        ? loadServerHistoricalTeamFormatStats(previousSeason.id, teamIds)
        : Promise.resolve(new Map<string, TeamFormatStatistics>()),
    ]);

    const currentByTeam = new Map(currentStatistics.map((entry) => [entry.teamId, entry]));

    return (
      <section className={styles.section} aria-labelledby="match-team-stats-heading">
        <header className={styles.header}>
          <span>Season performance</span>
          <h2 id="match-team-stats-heading">Team stats</h2>
          <p>Current season results plus last season’s archived singles and doubles performance.</p>
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
        <HistoricalStat
          label="Singles win %"
          record={previous?.singlesRecord}
          percentage={previous?.singlesWinPercentage}
        />
        <HistoricalStat
          label="Doubles win %"
          record={previous?.doublesRecord}
          percentage={previous?.doublesWinPercentage}
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

function HistoricalStat({
  label,
  record,
  percentage,
}: {
  label: string;
  record: {wins: number; losses: number; ties: number} | undefined;
  percentage: number | undefined;
}) {
  const available = hasResults(record);
  return (
    <div>
      <dt>{label}</dt>
      <dd>{available ? formatPercentage(percentage) : '—'}</dd>
      {available && record ? <small>{formatRecordSummary(record)}</small> : null}
    </div>
  );
}

async function getPreviousSeason(currentSeasonId: string): Promise<PreviousSeason | undefined> {
  // The public launch_seasons policy hides archived seasons. Historical contest
  // facts remain publicly readable, so derive the previous available season
  // from that archive instead of querying launch_seasons with public RLS.
  // Canonical season IDs start with coastal-clash-YYYY-YYYY, which sorts by year.
  const supabase = await createHistoricalStatsReadClient();
  const {data, error} = await supabase
    .from('historical_clash_contest_rating_facts')
    .select('season_id')
    .lt('season_id', currentSeasonId)
    .order('season_id', {ascending: false})
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.season_id) return undefined;

  return {id: data.season_id, name: data.season_id};
}

function compactSeasonName(name: string) {
  const match = name.match(/(20\d{2})\D+(20\d{2})/);
  if (!match) return name;
  return `${match[1]}–${match[2].slice(-2)}`;
}

function hasResults(record: {wins: number; losses: number; ties: number} | undefined) {
  return Boolean(record && record.wins + record.losses + record.ties > 0);
}

function formatRecordSummary(record: {wins: number; losses: number; ties: number}) {
  const base = `${record.wins}-${record.losses}`;
  return record.ties ? `${base}-${record.ties} W-L-T` : `${base} W-L`;
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
