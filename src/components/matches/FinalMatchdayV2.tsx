import type {CSSProperties} from 'react';
import {getVerifiedUpsets, matchupKey, type PublishedUpsetMatch, type ScoreboardUpset, type ScoreboardUpsets} from '@/services/matches/FinalMatchdayUpsets';
import {WeatherIcon} from '@/components/matches/WeatherIcon';
import infoStyles from './MatchdayInfoStrip.module.css';
import type {
  FinalMatchContest,
  FinalMatchdayV2Snapshot,
  FinalMatchTeam,
} from '@/services/matches/FinalMatchdayCanary';
import pageStyles from '@/app/matches/[id]/Matchday.module.css';
import heroStyles from './MatchHeroV1.module.css';
import styles from './FinalMatchdayV2.module.css';
import {
  buildFinalScoreBreakdown,
  displaySinglesRows,
  type FinalScoreBreakdown,
} from '@/services/matches/FinalScoreBreakdown';

export function FinalMatchdayV2({
  snapshot,
  publishedUpsets = [],
}: {snapshot: FinalMatchdayV2Snapshot; publishedUpsets?: PublishedUpsetMatch[]}) {
  const pageStyle: CSSProperties & {'--match-away': string; '--match-home': string} = {
    '--match-away': snapshot.awayTeam.primaryColor || '#0b7285',
    '--match-home': snapshot.homeTeam.primaryColor || '#a31621',
  };
  const breakdown = buildFinalScoreBreakdown(snapshot);
  const unplayedSlotPoints = snapshot.adjustments
    .filter((point) => point.category === 'UnplayedSlot')
    .reduce((total, point) => total + point.points, 0);
  const singles = displaySinglesRows(snapshot.contests, unplayedSlotPoints);
  const doubles = snapshot.contests.filter((contest) => contest.format === 'Doubles');
  const upsets = getVerifiedUpsets(snapshot, publishedUpsets);
  const upsetCount = Object.keys(upsets).length;
  const doublesTotals = breakdown.doubles;
  const singlesTotals = breakdown.singles;

  return (
    <main className={`${pageStyles.page} ${snapshot.awayTeam.id === 'kb' ? styles.kbAwayMuted : ''}`} style={pageStyle}>
      <FinalHero snapshot={snapshot} breakdown={breakdown} />
      <div className={`shell ${pageStyles.content} ${styles.finalContent}`}>
        <div className={styles.upsetToggleBar}>
          <label className={styles.upsetToggle}>
            <input type="checkbox" aria-label="Show verified upsets" />
            <span>Show upsets</span>
          </label>
          <small>{upsetCount
            ? `${upsetCount} verified upset${upsetCount === 1 ? '' : 's'}`
            : 'No verified upsets for this match'}</small>
        </div>
        <section className={styles.desktopScoreboard} aria-label="Final result scoreboard">
          <DesktopResultBoard
            title="Singles results"
            contests={singles}
            upsets={upsets}
            totals={singlesTotals}
            awayTeam={snapshot.awayTeam}
            homeTeam={snapshot.homeTeam}
          />
          <DesktopResultBoard
            title="Doubles results"
            contests={doubles}
            upsets={upsets}
            totals={doublesTotals}
            awayTeam={snapshot.awayTeam}
            homeTeam={snapshot.homeTeam}
          />
        </section>
        <section className={styles.mobileResultsCard} aria-label="Final result breakdown">
          <ResultDetails
            title="Singles results"
            contests={singles}
            upsets={upsets}
            totals={singlesTotals}
            awayTeam={snapshot.awayTeam}
            homeTeam={snapshot.homeTeam}
            initiallyOpen
          />
          <ResultDetails
            title="Doubles results"
            contests={doubles}
            upsets={upsets}
            totals={doublesTotals}
            awayTeam={snapshot.awayTeam}
            homeTeam={snapshot.homeTeam}
          />
        </section>
        <FinalAdjustmentSummary snapshot={snapshot} breakdown={breakdown} />
      </div>
    </main>
  );
}

function FinalHero({
  snapshot,
  breakdown,
}: {
  snapshot: FinalMatchdayV2Snapshot;
  breakdown: FinalScoreBreakdown;
}) {
  const {singles: singlesTotals, doubles: doublesTotals} = breakdown;
  const awayAdjustments = breakdown.otherAdjustments.away;
  const homeAdjustments = breakdown.otherAdjustments.home;

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
          <div className={`${styles.scoreLine} ${!Number.isInteger(snapshot.awayScore) ? styles.awayFractionScore : !Number.isInteger(snapshot.homeScore) ? styles.homeFractionScore : ''}`}>
            <div className={styles.scoreCell}>
              <strong className={Number.isInteger(snapshot.awayScore) ? undefined : styles.fractionScore}>{snapshot.awayScore}</strong>
              <small>{shortTeam(snapshot.awayTeam)}</small>
              <div className={styles.scoreBreakdown}>
                <span>S {formatPoint(singlesTotals.away)}</span>
                <span>D {formatPoint(doublesTotals.away)}</span>
              </div>
              {awayAdjustments > 0 ? <small aria-label={`${formatPoint(awayAdjustments)} administrative points`}>Adj +{formatPoint(awayAdjustments)}</small> : null}
              {breakdown.unitemized.away !== 0 ? <small>Review {formatSigned(breakdown.unitemized.away)}</small> : null}
            </div>
            <span className={styles.scoreDivider} aria-hidden="true" />
            <div className={styles.scoreCell}>
              <strong className={Number.isInteger(snapshot.homeScore) ? undefined : styles.fractionScore}>{snapshot.homeScore}</strong>
              <small>{shortTeam(snapshot.homeTeam)}</small>
              <div className={styles.scoreBreakdown}>
                <span>S {formatPoint(singlesTotals.home)}</span>
                <span>D {formatPoint(doublesTotals.home)}</span>
              </div>
              {homeAdjustments > 0 ? <small aria-label={`${formatPoint(homeAdjustments)} administrative points`}>Adj +{formatPoint(homeAdjustments)}</small> : null}
              {breakdown.unitemized.home !== 0 ? <small>Review {formatSigned(breakdown.unitemized.home)}</small> : null}
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
    <div className={`${heroStyles.heroTeam} ${styles.finalHeroTeam}`} data-side={side}>
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
  upsets,
  totals,
  awayTeam,
  homeTeam,
}: {
  title: string;
  contests: FinalMatchContest[];
  upsets: ScoreboardUpsets;
  totals: {away: number; home: number};
  awayTeam: FinalMatchTeam;
  homeTeam: FinalMatchTeam;
}) {
  return (
    <section className={styles.desktopBoard}>
      <header className={styles.desktopBoardHeader}>
        <strong>{title}</strong>
        <span>({contests.filter((contest) => !contest.unplayed).length} played{contests.some((contest) => contest.unplayed) ? ' · unplayed slot' : ''})</span>
      </header>
      <div className={styles.desktopColumnHeader} aria-hidden="true">
        <span>{awayTeam.name}</span>
        <span>Result</span>
        <span>{homeTeam.name}</span>
      </div>
      <div className={styles.desktopBoardRows}>
        {contests.length
          ? contests.map((contest) => <DesktopResultRow contest={contest} upset={upsets[matchupKey(contest)]} key={contest.id} />)
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

function DesktopResultRow({contest, upset}: {contest: FinalMatchContest; upset?: ScoreboardUpset}) {
  const awayWon = contest.awayOutcome === 'W';
  const homeWon = contest.homeOutcome === 'W';
  const tie = contest.awayOutcome === 'T' && contest.homeOutcome === 'T';
  const singlesTie = tie && contest.format === 'Singles';
  const pairClass = contest.format === 'Doubles' ? styles.desktopDoublesPair : '';
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
    <div className={styles.desktopResultRow} role="group" aria-label={`${contest.format} matchup ${contest.position}`}
      title={contest.card ? `Card ${contest.card}${contest.startingHole ? ` · Start hole ${contest.startingHole}` : ''}` : undefined}>
      <div className={`${awayClass} ${upset?.side === 'Away' ? styles.upsetWinnerSide : ''}`}>
        <PlayerNames players={contest.awayPlayers} pairClass={pairClass} />
        {upset?.side === 'Away' ? <UpsetTag upset={upset} /> : null}
      </div>
      <div className={styles.desktopVs} title={contest.resultText || undefined}>{contest.unplayed ? 'N/S' : contest.resultText || (tie ? 'TIE' : 'VS')}</div>
      <div className={`${homeClass} ${upset?.side === 'Home' ? styles.upsetWinnerSide : ''}`}>
        <PlayerNames players={contest.homePlayers} pairClass={pairClass} />
        {upset?.side === 'Home' ? <UpsetTag upset={upset} /> : null}
      </div>
    </div>
  );
}

function ResultDetails({
  title,
  contests,
  upsets,
  totals,
  awayTeam,
  homeTeam,
  initiallyOpen = false,
}: {
  title: string;
  contests: FinalMatchContest[];
  upsets: ScoreboardUpsets;
  totals: {away: number; home: number};
  awayTeam: FinalMatchTeam;
  homeTeam: FinalMatchTeam;
  initiallyOpen?: boolean;
}) {
  return (
    <details className={styles.resultDetails} open={initiallyOpen}>
      <summary>
        <span className={styles.resultSummaryTitle}>{title}</span>
        <span className={styles.resultSummaryScore} aria-label={`${awayTeam.name} ${formatPoint(totals.away)} to ${homeTeam.name} ${formatPoint(totals.home)}`}>
          <small className={styles.resultSummaryTeam}>{shortTeam(awayTeam)}</small>
          <strong>{formatPoint(totals.away)}</strong>
          <small>–</small>
          <small className={styles.resultSummaryTeam}>{shortTeam(homeTeam)}</small>
          <strong>{formatPoint(totals.home)}</strong>
        </span>
      </summary>
      <div className={styles.mobileColumnHeader} aria-hidden="true">
        <span>{shortTeam(awayTeam)}</span>
        <span>Result</span>
        <span>{shortTeam(homeTeam)}</span>
      </div>
      <div className={styles.resultRows}>
        {contests.length
          ? contests.map((contest) => <ResultRow contest={contest} upset={upsets[matchupKey(contest)]} key={contest.id} />)
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

function ResultRow({contest, upset}: {contest: FinalMatchContest; upset?: ScoreboardUpset}) {
  const awayWon = contest.awayOutcome === 'W';
  const homeWon = contest.homeOutcome === 'W';
  const tie = contest.awayOutcome === 'T' && contest.homeOutcome === 'T';
  const singlesTie = tie && contest.format === 'Singles';
  const pairClass = contest.format === 'Doubles' ? styles.doublesPair : '';
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
    <div className={styles.resultRow} role="group" aria-label={`${contest.format} matchup ${contest.position}`}
      title={contest.card ? `Card ${contest.card}${contest.startingHole ? ` · Start hole ${contest.startingHole}` : ''}` : undefined}>
      <div className={`${awayClass} ${upset?.side === 'Away' ? styles.upsetWinnerSide : ''}`}>
        <PlayerNames players={contest.awayPlayers} pairClass={pairClass} />
        {upset?.side === 'Away' ? <UpsetTag upset={upset} /> : null}
      </div>
      <div className={styles.outcome} title={contest.resultText || undefined}>{contest.unplayed ? <span>N/S</span> : contest.resultText ? <span>{contest.resultText}</span> : tie ? <span>TIE</span> : null}</div>
      <div className={`${homeClass} ${upset?.side === 'Home' ? styles.upsetWinnerSide : ''}`}>
        <PlayerNames players={contest.homePlayers} pairClass={pairClass} />
        {upset?.side === 'Home' ? <UpsetTag upset={upset} /> : null}
      </div>
    </div>
  );
}

function UpsetTag({upset}: {upset: ScoreboardUpset}) {
  return <span className={styles.upsetBadge}
    aria-label="Upset win"
    title="Upset win">{upset.label}</span>;
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

function FinalConditions({snapshot}: {snapshot: FinalMatchdayV2Snapshot}) {
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

function FinalAdjustmentSummary({
  snapshot,
  breakdown,
}: {
  snapshot: FinalMatchdayV2Snapshot;
  breakdown: FinalScoreBreakdown;
}) {
  if (!snapshot.adjustments.length && breakdown.balanced) return null;
  const teamName = (teamId: string) =>
    teamId === snapshot.homeTeam.id ? snapshot.homeTeam.name
      : teamId === snapshot.awayTeam.id ? snapshot.awayTeam.name : 'Unknown team';
  const descriptions: Record<string, string> = {
    UnplayedSlot: 'Unplayed singles slot (included in Singles)',
    NoShow: 'No-show penalties',
    WomenBonus: 'Women bonus',
    Penalty: 'Other penalties',
    Other: 'Other points',
  };
  return (
    <section className={styles.adjustmentsSection} aria-label="Final scoring adjustments">
      <header><strong>Scoring adjustments</strong></header>
      <div className={styles.adjustmentRows}>
        {snapshot.adjustments.map((adjustment, index) => (
          <div className={styles.adjustmentRow} key={`${adjustment.awardedTeamId}-${adjustment.category}-${index}`}>
            <span><strong>{teamName(adjustment.awardedTeamId)}</strong> · {descriptions[adjustment.category]}</span>
            <b>+{formatPoint(adjustment.points)}</b>
            {adjustment.note ? <small>{adjustment.note}</small> : null}
          </div>
        ))}
        {!breakdown.balanced ? (
          <div className={styles.auditWarning} role="status">
            Unitemized score difference: {snapshot.awayTeam.name} {formatSigned(breakdown.unitemized.away)}
            {' · '}{snapshot.homeTeam.name} {formatSigned(breakdown.unitemized.home)}.
            Review the official adjustment ledger; published totals are not modified.
          </div>
        ) : null}
      </div>
    </section>
  );
}

function formatSigned(value: number) {
  return `${value > 0 ? '+' : ''}${formatPoint(value)}`;
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
