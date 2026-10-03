import type {CSSProperties} from 'react';
import {WeatherIcon} from '@/components/matches/WeatherIcon';
import infoStyles from './MatchdayInfoStrip.module.css';
import type {
  FinalMatchContest,
  FinalMatchdaySnapshot,
  FinalMatchTeam,
} from '@/services/matches/FinalMatchdaySnapshot';
import pageStyles from '@/app/matches/[id]/Matchday.module.css';
import heroStyles from './MatchHeroV1.module.css';
import styles from './FinalMatchday.module.css';

export function FinalMatchday({snapshot}: {snapshot: FinalMatchdaySnapshot}) {
  const pageStyle: CSSProperties & {'--match-away': string; '--match-home': string} = {
    '--match-away': snapshot.awayTeam.primaryColor || '#0b7285',
    '--match-home': snapshot.homeTeam.primaryColor || '#a31621',
  };
  const singles = snapshot.contests.filter((contest) => contest.format === 'Singles');
  const doubles = snapshot.contests.filter((contest) => contest.format === 'Doubles');
  const doublesTotals = contestPoints(doubles, 2);
  const singlesTotals = {
    away: Math.max(0, snapshot.awayScore - doublesTotals.away),
    home: Math.max(0, snapshot.homeScore - doublesTotals.home),
  };

  return (
    <main className={pageStyles.page} style={pageStyle}>
      <FinalHero snapshot={snapshot} singlesTotals={singlesTotals} doublesTotals={doublesTotals} />
      <div className={`shell ${pageStyles.content} ${styles.finalContent}`}>
        <section className={styles.resultsCard} aria-label="Final result breakdown">
          <ResultDetails title="Singles results" contests={singles} />
          <ResultDetails title="Doubles results" contests={doubles} />
        </section>
      </div>
    </main>
  );
}

function FinalHero({
  snapshot,
  singlesTotals,
  doublesTotals,
}: {
  snapshot: FinalMatchdaySnapshot;
  singlesTotals: {away: number; home: number};
  doublesTotals: {away: number; home: number};
}) {
  return (
    <section className={heroStyles.matchHero} data-matchday-hero>
      <div className={`${heroStyles.heroTeams} ${styles.finalHeroTeams}`}>
        <div className={heroStyles.heroLabel}>
          <span>Team Matchday</span>
          {snapshot.roundNumber ? <strong>Round {snapshot.roundNumber}</strong> : null}
        </div>

        <TeamSide team={snapshot.awayTeam} side="away" />
        <div className={styles.heroScoreboard} aria-label={`Final score ${snapshot.awayTeam.name} ${snapshot.awayScore}, ${snapshot.homeTeam.name} ${snapshot.homeScore}`}>
          <span className={styles.finalTag}>Final</span>
          <div className={styles.scoreLine}>
            <div className={styles.scoreCell}>
              <strong>{snapshot.awayScore}</strong>
              <small>{shortTeam(snapshot.awayTeam)}</small>
              <div className={styles.scoreBreakdown}>
                <span>S {formatPoint(singlesTotals.away)}</span>
                <span>D {formatPoint(doublesTotals.away)}</span>
              </div>
            </div>
            <span className={styles.scoreDivider} aria-hidden="true" />
            <div className={styles.scoreCell}>
              <strong>{snapshot.homeScore}</strong>
              <small>{shortTeam(snapshot.homeTeam)}</small>
              <div className={styles.scoreBreakdown}>
                <span>S {formatPoint(singlesTotals.home)}</span>
                <span>D {formatPoint(doublesTotals.home)}</span>
              </div>
            </div>
          </div>
        </div>
        <TeamSide team={snapshot.homeTeam} side="home" />
        <div className={heroStyles.centerGlow} aria-hidden="true" />
      </div>

      <div className={`${heroStyles.heroMeta} ${styles.finalHeroMeta} matchday-hero-meta`}>
        <div className={styles.heroMetaTop}>
          <span>{formatDate(snapshot.date)}</span>
          <span>{formatTime(snapshot.time)}</span>
          {snapshot.course.mapUrl
            ? <a href={snapshot.course.mapUrl} target="_blank" rel="noreferrer">{snapshot.course.name}</a>
            : <span>{snapshot.course.name}</span>}
        </div>
        {snapshot.weather ? <FinalConditions snapshot={snapshot} /> : null}
      </div>
    </section>
  );
}

function TeamSide({team, side}: {team: FinalMatchTeam; side: 'away' | 'home'}) {
  return (
    <div className={heroStyles.heroTeam} data-side={side}>
      {team.logo
        ? <img src={team.logo} alt={`${team.name} logo`} className={heroStyles.heroLogo} />
        : <div className={heroStyles.heroLogoFallback}>{initials(team.name)}</div>}
      <strong>{team.name}</strong>
      <span>{side === 'away' ? 'Away' : 'Home'}</span>
    </div>
  );
}

function ResultDetails({title, contests}: {title: string; contests: FinalMatchContest[]}) {
  return (
    <details className={styles.resultDetails}>
      <summary>
        <span>{title}</span>
      </summary>
      <div className={styles.resultRows}>
        {contests.length
          ? contests.map((contest) => <ResultRow contest={contest} key={contest.id} />)
          : <p className={styles.empty}>No individual results were posted.</p>}
      </div>
    </details>
  );
}

function ResultRow({contest}: {contest: FinalMatchContest}) {
  const awayWon = contest.awayOutcome === 'W';
  const homeWon = contest.homeOutcome === 'W';
  const tie = contest.awayOutcome === 'T' && contest.homeOutcome === 'T';
  return (
    <div className={styles.resultRow}>
      <div className={awayWon ? `${styles.playerSide} ${styles.awayWinner}` : styles.playerSide}>
        {contest.awayPlayers.map((player) => player.name).join(' / ') || '—'}
      </div>
      <div className={styles.outcome}>{tie ? <span>TIE</span> : null}</div>
      <div className={homeWon ? `${styles.playerSide} ${styles.homeWinner}` : styles.playerSide}>
        {contest.homePlayers.map((player) => player.name).join(' / ') || '—'}
      </div>
    </div>
  );
}

function FinalConditions({snapshot}: {snapshot: FinalMatchdaySnapshot}) {
  const weather = snapshot.weather!;
  const wind = weather.wind === null
    ? '—'
    : weather.wind === 0
      ? 'Calm'
      : `${weather.windDirection === 'Variable' ? 'Var' : weather.windDirection ?? ''} ${weather.wind} mph`.trim();

  return (
    <div className={styles.heroConditions} aria-label="Matchday conditions">
      <span className={infoStyles.label}>Conditions</span>
      <div className={infoStyles.weatherItems}>
        <span className={infoStyles.weatherItem}>
          <WeatherIcon name={weather.condition === 'cloudy' ? 'cloud' : weather.condition} />
          <strong>{weather.temperature}°</strong>
        </span>
        <span className={infoStyles.weatherItem}>
          <WeatherIcon name="wind" />
          <strong>{wind}</strong>
        </span>
      </div>
    </div>
  );
}

function contestPoints(contests: FinalMatchContest[], winPoints: number) {
  return contests.reduce((total, contest) => {
    if (contest.awayOutcome === 'W') total.away += winPoints;
    else if (contest.homeOutcome === 'W') total.home += winPoints;
    else if (contest.awayOutcome === 'T' && contest.homeOutcome === 'T') {
      total.away += winPoints / 2;
      total.home += winPoints / 2;
    }
    return total;
  }, {away: 0, home: 0});
}

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('en-US', {weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC'}).format(date)
    : value;
}

function formatTime(value: string | null) {
  if (!value) return 'Time TBD';
  const [hours, minutes] = value.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;
  return new Intl.DateTimeFormat('en-US', {hour: 'numeric', minute: '2-digit'})
    .format(new Date(2000, 0, 1, hours, minutes));
}

function formatPoint(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function shortTeam(team: FinalMatchTeam) {
  return team.shortName || team.name;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}
