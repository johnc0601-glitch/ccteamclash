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
      <FinalHero snapshot={snapshot} />
      <div className={`shell ${pageStyles.content} ${styles.finalContent}`}>
        <section className={styles.resultsCard} aria-label="Final result breakdown">
          <div className={styles.compactBreakdown}>
            <strong className={styles.breakdownLabel}>Results</strong>
            <div className={styles.breakdownScores}>
              <ResultTotal
                label="Singles"
                awayTeam={snapshot.awayTeam}
                homeTeam={snapshot.homeTeam}
                awayScore={singlesTotals.away}
                homeScore={singlesTotals.home}
              />
              <span className={styles.breakdownDivider} aria-hidden="true">·</span>
              <ResultTotal
                label="Doubles"
                awayTeam={snapshot.awayTeam}
                homeTeam={snapshot.homeTeam}
                awayScore={doublesTotals.away}
                homeScore={doublesTotals.home}
              />
            </div>
          </div>

          <MatchResultsDetails singles={singles} doubles={doubles} />
        </section>

        {snapshot.weather ? <FinalConditions snapshot={snapshot} /> : null}
      </div>
    </main>
  );
}

function FinalHero({snapshot}: {snapshot: FinalMatchdaySnapshot}) {
  return (
    <section className={heroStyles.matchHero} data-matchday-hero>
      <div className={heroStyles.heroTeams}>
        <div className={heroStyles.heroLabel}>
          <span>Team Matchday</span>
          {snapshot.roundNumber ? <strong>Round {snapshot.roundNumber}</strong> : null}
        </div>

        <TeamSide team={snapshot.awayTeam} side="away" />
        <div className={styles.heroFinal} aria-label={`Final score ${snapshot.awayTeam.name} ${snapshot.awayScore}, ${snapshot.homeTeam.name} ${snapshot.homeScore}`}>
          <strong>{snapshot.awayScore} – {snapshot.homeScore}</strong>
          <span>Final</span>
        </div>
        <TeamSide team={snapshot.homeTeam} side="home" />
        <div className={heroStyles.centerGlow} aria-hidden="true" />
      </div>

      <div className={`${heroStyles.heroMeta} matchday-hero-meta`}>
        <span>{formatDate(snapshot.date)}</span>
        <span>{formatTime(snapshot.time)}</span>
        {snapshot.course.mapUrl
          ? <a href={snapshot.course.mapUrl} target="_blank" rel="noreferrer">{snapshot.course.name}</a>
          : <span>{snapshot.course.name}</span>}
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

function ResultTotal({
  label,
  awayTeam,
  homeTeam,
  awayScore,
  homeScore,
}: {
  label: string;
  awayTeam: FinalMatchTeam;
  homeTeam: FinalMatchTeam;
  awayScore: number;
  homeScore: number;
}) {
  return (
    <span className={styles.resultTotal}>
      <em>{label}</em>
      <strong>
        <b>{shortTeam(awayTeam)} {formatPoint(awayScore)}</b>
        <i>–</i>
        <b>{formatPoint(homeScore)} {shortTeam(homeTeam)}</b>
      </strong>
    </span>
  );
}

function MatchResultsDetails({
  singles,
  doubles,
}: {
  singles: FinalMatchContest[];
  doubles: FinalMatchContest[];
}) {
  const total = singles.length + doubles.length;
  return (
    <details className={styles.resultDetails}>
      <summary>
        <span>Match results</span>
        <small>{total} matchups</small>
      </summary>
      <div className={styles.resultGroups}>
        <ResultGroup title="Singles" contests={singles} />
        <ResultGroup title="Doubles" contests={doubles} />
      </div>
    </details>
  );
}

function ResultGroup({title, contests}: {title: string; contests: FinalMatchContest[]}) {
  return (
    <section className={styles.resultGroup}>
      <header>
        <strong>{title}</strong>
        <span>{contests.length}</span>
      </header>
      <div className={styles.resultRows}>
        {contests.length
          ? contests.map((contest) => <ResultRow contest={contest} key={contest.id} />)
          : <p className={styles.empty}>No individual results were posted.</p>}
      </div>
    </section>
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
      <div className={styles.outcome}>{tie ? <span>TIE</span> : <small>{contest.position}</small>}</div>
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
    <section className={`${infoStyles.strip} ${styles.lockedConditions}`} aria-label="Matchday conditions">
      <div className={infoStyles.weather}>
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
    </section>
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
