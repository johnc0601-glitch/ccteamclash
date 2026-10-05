import Link from 'next/link';
import type {
  StandingRound,
  TeamRoundStanding,
  TeamStanding,
} from '@/services/standings';
import styles from './StandingsTable.module.css';

export function StandingsTable({
  entries,
  rounds,
}: {
  entries: TeamStanding[];
  rounds: StandingRound[];
}) {
  return (
    <div className={styles.shell}>
      <div className={styles.desktopScroll}>
        <table className={styles.desktopTable}>
          <thead>
            <tr className={styles.groupHeader}>
              <th className={styles.placeHeader} rowSpan={2}>Place</th>
              <th className={styles.teamHeader} rowSpan={2}>Team</th>
              <th rowSpan={2}>Wins</th>
              <th rowSpan={2}>Points %</th>
              <th colSpan={2}>Points</th>
              {rounds.map((round) => (
                <th colSpan={3} key={round.id}>{formatRoundLabel(round)}</th>
              ))}
            </tr>
            <tr className={styles.detailHeader}>
              <th>Total</th>
              <th>Available</th>
              {rounds.flatMap((round) => [
                <th key={`${round.id}-outcome`}>W/L</th>,
                <th key={`${round.id}-points`}>Points</th>,
                <th key={`${round.id}-available`}>Available</th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const results = new Map(entry.roundResults.map((result) => [result.roundId, result]));
              return (
                <tr key={entry.team.id}>
                  <td className={styles.placeCell}>{entry.rank}</td>
                  <td
                    className={styles.teamCell}
                    style={{borderLeftColor: entry.team.primaryColor || 'var(--cc-gold)'}}
                  >
                    <Link href={`/teams/${entry.team.id}`} className={styles.teamLink}>
                      {entry.team.logo ? (
                        <img
                          className={styles.teamLogo}
                          src={entry.team.logo}
                          alt=""
                          aria-hidden="true"
                          loading="lazy"
                        />
                      ) : null}
                      <strong>{entry.team.name}</strong>
                    </Link>
                  </td>
                  <td className={styles.wins}>{entry.wins}</td>
                  <td className={styles.percentage}>{formatPercentage(entry.pointsPercentage)}</td>
                  <td>{formatPoints(entry.pointsFor)}</td>
                  <td>{formatPoints(entry.pointsAvailable)}</td>
                  {rounds.flatMap((round) => {
                    const result = results.get(round.id);
                    return roundCells(round, result);
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={styles.mobileList}>
        {entries.map((entry) => {
          const results = new Map(entry.roundResults.map((result) => [result.roundId, result]));
          return (
            <article className={styles.mobileCard} key={entry.team.id}>
              <header className={styles.mobileHeader}>
                <span className={styles.mobileRank}>{entry.rank}</span>
                <Link href={`/teams/${entry.team.id}`} className={styles.mobileTeam}>
                  {entry.team.logo ? (
                    <img
                      className={styles.mobileLogo}
                      src={entry.team.logo}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                    />
                  ) : null}
                  <strong>{entry.team.name}</strong>
                </Link>
              </header>

              <div className={styles.mobileMetrics}>
                <Metric label="Wins" value={String(entry.wins)} emphasis />
                <Metric label="Points %" value={formatPercentage(entry.pointsPercentage)} />
                <Metric
                  label="Points"
                  value={`${formatPoints(entry.pointsFor)} / ${formatPoints(entry.pointsAvailable)}`}
                />
              </div>

              <div className={styles.mobileRounds}>
                {rounds.map((round) => {
                  const result = results.get(round.id);
                  const content = (
                    <>
                      <span className={styles.mobileRoundLabel}>{formatRoundLabel(round)}</span>
                      <strong className={outcomeClass(result?.outcome)}>
                        {result?.outcome ?? '—'}
                      </strong>
                      <span>
                        {result
                          ? `${formatPoints(result.pointsFor)} / ${formatPoints(result.pointsAvailable)}`
                          : 'Not played'}
                      </span>
                    </>
                  );
                  return result ? (
                    <Link
                      className={styles.mobileRound}
                      href={`/matches/${result.matchId}`}
                      key={round.id}
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className={styles.mobileRound} key={round.id}>{content}</div>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className={emphasis ? styles.metricEmphasis : undefined}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function roundCells(round: StandingRound, result: TeamRoundStanding | undefined) {
  if (!result) {
    return [
      <td className={styles.emptyRound} key={`${round.id}-outcome`}>—</td>,
      <td className={styles.emptyRound} key={`${round.id}-points`}>—</td>,
      <td className={styles.availableCell} key={`${round.id}-available`}>—</td>,
    ];
  }

  return [
    <td key={`${round.id}-outcome`} className={styles.outcomeCell}>
      <Link
        href={`/matches/${result.matchId}`}
        className={outcomeClass(result.outcome)}
        aria-label={`${formatRoundLabel(round)} result: ${result.outcome}`}
      >
        {result.outcome}
      </Link>
    </td>,
    <td key={`${round.id}-points`} className={styles.roundPoints}>
      {formatPoints(result.pointsFor)}
    </td>,
    <td key={`${round.id}-available`} className={styles.availableCell}>
      {formatPoints(result.pointsAvailable)}
    </td>,
  ];
}

function outcomeClass(outcome: TeamRoundStanding['outcome'] | undefined): string {
  if (outcome === 'W') return styles.win;
  if (outcome === 'L') return styles.loss;
  if (outcome === 'T') return styles.tie;
  return '';
}

function formatRoundLabel(round: StandingRound): string {
  if (round.date) {
    const date = new Date(`${round.date}T00:00:00.000Z`);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat('en-US', {
        month: 'long',
        timeZone: 'UTC',
      }).format(date);
    }
  }
  const name = round.name.trim();
  return name && !/^round\s*\d+$/i.test(name) ? name : `Round ${round.number}`;
}

function formatPoints(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}
