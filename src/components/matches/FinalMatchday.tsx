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
  const singlesTotals = contestPoints(singles, 1);

  return (
    <main className={`${pageStyles.page} ${snapshot.awayTeam.id === 'kb' ? styles.kbAwayMuted : ''}`} style={pageStyle}>
      <FinalHero snapshot={snapshot} singlesTotals={singlesTotals} doublesTotals={doublesTotals} />
      <div className={`shell ${pageStyles.content} ${styles.finalContent}`}>
        <section className={styles.desktopScoreboard} aria-label="Final result scoreboard">
          <DesktopResultBoard
            title="Singles results"
            contests={singles}
            totals={singlesTotals}
            awayTeam={snapshot.awayTeam}
            homeTeam={snapshot.homeTeam}
          />
          <DesktopResultBoard
            title="Doubles results"
            contests={doubles}
            totals={doublesTotals}
            awayTeam={snapshot.awayTeam}
            homeTeam={snapshot.homeTeam}
          />
        </section>
        <section className={styles.mobileResultsCard} aria-label="Final result breakdown">
          <ResultDetails
            title="Singles results"
            contests={singles}
            totals={singlesTotals}
            awayTeam={snapshot.awayTeam}
            homeTeam={snapshot.homeTeam}
            initiallyOpen
          />
          <ResultDetails
            title="Doubles results"
            contests={doubles}
            totals={doublesTotals}
            awayTeam={snapshot.awayTeam}
            homeTeam={snapshot.homeTeam}
          />
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
        ? <img
            src={team.logo}
            alt={`${team.name} logo`}
            className={`${heroStyles.heroLogo} ${side === 'home' ? styles.finalHomeLogo : ''}`}
          />
        : <div className={`${heroStyles.heroLogoFallback} ${side === 'home' ? styles.finalHomeLogo : ''}`}>{initials(team.name)}</div>}
      <strong>{team.name}</strong>
      <span>{side === 'away' ? 'Away' : 'Home'}</span>
    </div>
  );
}

function DesktopResultBoard({
  title,
  contests,
  totals,
  awayTeam,
  homeTeam,
}: {
  title: string;
  contests: FinalMatchContest[];
  totals: {away: number; home: number};
  awayTeam: FinalMatchTeam;
  homeTeam: FinalMatchTeam;
}) {
  return (
    <section className={styles.desktopBoard}>
      <header className={styles.desktopBoardHeader}>
        <strong>{title}</strong>
        <span>({contests.length})</span>
      </header>
      <div className={styles.desktopColumnHeader} aria-hidden="true">
        <span>#</span>
        <span>{awayTeam.name}</span>
        <span>Result</span>
        <span>{homeTeam.name}</span>
      </div>
      <div className={styles.desktopBoardRows}>
        {contests.length
          ? contests.map((contest) => <DesktopResultRow contest={contest} key={contest.id} />)
          : <p className={styles.empty}>No individual results were posted.</p>}
      </div>
      <div className={styles.desktopBoardTotals} aria-label={`${title} totals: ${awayTeam.name} ${formatPoint(totals.away)}, ${homeTeam.name} ${formatPoint(totals.home)}`}>
        <div className={styles.desktopTeamTotal}>
          <strong>{formatPoint(totals.away)}</strong>
          <span>{awayTeam.name}</span>
        </div>
        <span className={styles.desktopTotalLabel}>Section score</span>
        <div className={`${styles.desktopTeamTotal} ${styles.desktopHomeTotal}`}>
          <span>{homeTeam.name}</span>
          <strong>{formatPoint(totals.home)}</strong>
        </div>
      </div>
    </section>
  );
}

function DesktopResultRow({contest}: {contest: FinalMatchContest}) {
  const awayWon = contest.awayOutcome === 'W';
  const homeWon = contest.homeOutcome === 'W';
  const tie = contest.awayOutcome === 'T' && contest.homeOutcome === 'T';
  const singlesTie = tie && contest.format === 'Singles';
  const pairClass = contest.format === 'Doubles' ? styles.desktopDoublesPair : '';
  const rowLabel = contest.format === 'Doubles' ? `D${contest.position}` : String(contest.position);
  const awayClass = awayWon
    ? `${styles.desktopPlayerSide} ${styles.awayWinner}`
    : singlesTie
      ? `${styles.desktopPlayerSide} ${styles.tiePlayer}`
      : styles.desktopPlayerSide;
  const homeClass = homeWon
    ? `${styles.desktopPlayerSide} ${styles.homeWinner}`
    : singlesTie
      ? `${styles.desktopPlayerSide} ${styles.tiePlayer}`
      : styles.desktopPlayerSide;

  return (
    <div className={styles.desktopResultRow}>
      <span className={styles.desktopPosition}>{rowLabel}</span>
      <div className={awayClass}>
        <PlayerNames players={contest.awayPlayers} pairClass={pairClass} />
      </div>
      <div className={styles.desktopVs}>{tie ? 'TIE' : 'VS'}</div>
      <div className={homeClass}>
        <PlayerNames players={contest.homePlayers} pairClass={pairClass} />
      </div>
    </div>
  );
}

function ResultDetails({
  title,
  contests,
  totals,
  awayTeam,
  homeTeam,
  initiallyOpen = false,
}: {
  title: string;
  contests: FinalMatchContest[];
  totals: {away: number; home: number};
  awayTeam: FinalMatchTeam;
  homeTeam: FinalMatchTeam;
  initiallyOpen?: boolean;
}) {
  return (
    <details className={styles.resultDetails} open={initiallyOpen}>
      <summary>
        <span className={styles.resultSummaryTitle}>{title}</span>
        <span className={styles.resultSummaryScore} aria-label={`${formatPoint(totals.away)} to ${formatPoint(totals.home)}`}>
          <strong>{formatPoint(totals.away)}</strong>
          <small>–</small>
          <strong>{formatPoint(totals.home)}</strong>
        </span>
      </summary>
      <div className={styles.mobileColumnHeader} aria-hidden="true">
        <span>#</span>
        <span>{shortTeam(awayTeam)}</span>
        <span>Result</span>
        <span>{shortTeam(homeTeam)}</span>
      </div>
      <div className={styles.resultRows}>
        {contests.length
          ? contests.map((contest) => <ResultRow contest={contest} key={contest.id} />)
          : <p className={styles.empty}>No individual results were posted.</p>}
      </div>
      <div className={styles.mobileSectionTotals} aria-label={`${title} totals: ${awayTeam.name} ${formatPoint(totals.away)}, ${homeTeam.name} ${formatPoint(totals.home)}`}>
        <span><strong>{formatPoint(totals.away)}</strong> {shortTeam(awayTeam)}</span>
        <small>Section score</small>
        <span>{shortTeam(homeTeam)} <strong>{formatPoint(totals.home)}</strong></span>
      </div>
    </details>
  );
}

function ResultRow({contest}: {contest: FinalMatchContest}) {
  const awayWon = contest.awayOutcome === 'W';
  const homeWon = contest.homeOutcome === 'W';
  const tie = contest.awayOutcome === 'T' && contest.homeOutcome === 'T';
  const singlesTie = tie && contest.format === 'Singles';
  const pairClass = contest.format === 'Doubles' ? styles.doublesPair : '';
  const rowLabel = contest.format === 'Doubles' ? `D${contest.position}` : String(contest.position);
  const awayClass = awayWon
    ? `${styles.playerSide} ${styles.awayWinner}`
    : singlesTie
      ? `${styles.playerSide} ${styles.tiePlayer}`
      : styles.playerSide;
  const homeClass = homeWon
    ? `${styles.playerSide} ${styles.homeWinner}`
    : singlesTie
      ? `${styles.playerSide} ${styles.tiePlayer}`
      : styles.playerSide;
  return (
    <div className={styles.resultRow}>
      <span className={styles.resultPosition}>{rowLabel}</span>
      <div className={awayClass}>
        <PlayerNames players={contest.awayPlayers} pairClass={pairClass} />
      </div>
      <div className={styles.outcome}>{tie ? <span>TIE</span> : null}</div>
      <div className={homeClass}>
        <PlayerNames players={contest.homePlayers} pairClass={pairClass} />
      </div>
    </div>
  );
}

function PlayerNames({
  players,
  pairClass,
}: {
  players: FinalMatchContest['awayPlayers'];
  pairClass: string;
}) {
  if (!players.length) return <>—</>;
  return (
    <span className={`${styles.playerList} ${pairClass}`}>
      {players.map((player) => <span className={styles.playerName} key={player.id}>{player.name}</span>)}
    </span>
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
