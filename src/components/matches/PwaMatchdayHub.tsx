import Link from 'next/link';
import type {CSSProperties} from 'react';
import type {MatchResult} from '@/domain/results/MatchResult';
import type {Match} from '@/domain/schedule/Match';
import type {PersonalAttendance} from '@/domain/match-roster/MatchAttendance';
import type {PublicMatchday} from '@/services/matches/MatchdayService';
import type {PublicMatchPrediction} from '@/services/teamStrength/PublicMatchPrediction';
import styles from './PwaMatchdayHub.module.css';

type Phase = 'upcoming' | 'today' | 'awaiting' | 'final' | 'postponed' | 'cancelled' | 'rain';

export function PwaMatchdayHub({
  matchday,
  match,
  result,
  prediction,
  attendance,
  hasManagedRoster,
}: {
  matchday: PublicMatchday;
  match: Match;
  result: MatchResult | undefined;
  prediction: PublicMatchPrediction | undefined;
  attendance: PersonalAttendance | undefined;
  hasManagedRoster: boolean;
}) {
  const phase = resolvePhase(match, Boolean(result));
  const phaseCopy = getPhaseCopy(phase);
  const awayChance = prediction?.state === 'calculated' ? prediction.awayChanceOfVictory : null;
  const homeChance = prediction?.state === 'calculated' ? prediction.homeChanceOfVictory : null;
  const style = {
    '--pwa-away': matchday.awayTeam.team?.primaryColor || '#0b4fb3',
    '--pwa-home': matchday.homeTeam.team?.primaryColor || '#a20b78',
  } as CSSProperties;

  return (
    <section className={styles.hub} data-pwa-surface="matchday" style={style} aria-label="Matchday overview">
      <div className={styles.state}>
        <span data-phase={phase}>{phaseCopy.label}</span>
        <strong>{phaseCopy.detail}</strong>
      </div>

      <div className={styles.matchup}>
        <Team
          name={matchday.awayTeam.name}
          logo={matchday.awayTeam.logo}
          score={result?.awayScore ?? undefined}
          side="away"
        />
        <div className={styles.center}>
          <b>{result ? 'FINAL' : 'VS'}</b>
          <span>{matchday.date}</span>
        </div>
        <Team
          name={matchday.homeTeam.name}
          logo={matchday.homeTeam.logo}
          score={result?.homeScore ?? undefined}
          side="home"
        />
      </div>

      <div className={styles.meta}>
        <span>{matchday.time}</span>
        {matchday.courseDetails?.mapUrl ? (
          <a href={matchday.courseDetails.mapUrl} target="_blank" rel="noreferrer">
            {matchday.courseDetails.name}
          </a>
        ) : (
          <span>{matchday.courseDetails?.name ?? matchday.course}</span>
        )}
      </div>

      {prediction?.state === 'calculated' && awayChance !== null && homeChance !== null ? (
        <div className={styles.prediction}>
          <div><span>{matchday.awayTeam.name}</span><strong>{awayChance}%</strong></div>
          <div className={styles.predictionTrack}>
            <i style={{width: `${awayChance}%`}} />
          </div>
          <div><strong>{homeChance}%</strong><span>{matchday.homeTeam.name}</span></div>
          <small>{prediction.stageLabel}</small>
        </div>
      ) : null}

      {attendance ? (
        <div className={styles.personal}>
          <span>Your availability</span>
          <strong>{attendance.status === 'Playing' ? 'Yes' : attendance.status === 'NotPlaying' ? 'No' : 'Not answered'}</strong>
          {attendance.attendanceOpen ? <a href="#availability">Change</a> : <em>Locked</em>}
        </div>
      ) : null}

      <nav className={styles.shortcuts} aria-label="Matchday sections">
        {phase === 'final' ? <a href="#scoreboard">Results</a> : null}
        {phase !== 'final' && prediction ? <a href="#prediction">Prediction</a> : null}
        {attendance ? <a href="#availability">Availability</a> : null}
        {hasManagedRoster ? <a href="#captain-roster">Captain</a> : null}
        <a href="#match-feed">Feed</a>
        <a href="#match-rosters">Rosters</a>
      </nav>

      {phase === 'postponed' || phase === 'rain' || phase === 'cancelled' ? (
        <Link className={styles.scheduleLink} href="/schedule">View league schedule</Link>
      ) : null}
    </section>
  );
}

function Team({
  name,
  logo,
  score,
  side,
}: {
  name: string;
  logo: string;
  score: number | undefined;
  side: 'away' | 'home';
}) {
  return (
    <div className={styles.team} data-side={side}>
      <div className={styles.logo}>
        {logo ? <img src={logo} alt="" /> : <span>{initials(name)}</span>}
      </div>
      <strong>{name}</strong>
      {score !== undefined ? <b>{score}</b> : <small>{side === 'away' ? 'Away' : 'Home'}</small>}
    </div>
  );
}

function resolvePhase(match: Match, hasResult: boolean): Phase {
  if (hasResult || match.status === 'Completed') return 'final';
  if (match.status === 'Postponed') return 'postponed';
  if (match.status === 'Cancelled') return 'cancelled';
  if (match.status === 'Rain Delay') return 'rain';
  if (!match.date) return 'upcoming';

  const easternToday = dateInEastern(new Date());
  if (match.date === easternToday) return 'today';
  if (match.date < easternToday) return 'awaiting';
  return 'upcoming';
}

function getPhaseCopy(phase: Phase) {
  switch (phase) {
    case 'today': return {label: 'Matchday · Today', detail: 'Roster, scoring, feed, and photos in one place'};
    case 'awaiting': return {label: 'Awaiting results', detail: 'Matchday is complete; official results have not been published yet'};
    case 'final': return {label: 'Final', detail: 'Official Team Clash result'};
    case 'postponed': return {label: 'Postponed', detail: 'This match has been postponed'};
    case 'cancelled': return {label: 'Cancelled', detail: 'This match has been cancelled'};
    case 'rain': return {label: 'Rain delay', detail: 'Match status is currently a rain delay'};
    default: return {label: 'Upcoming Matchday', detail: 'Get ready: availability, prediction, roster, and course'};
  }
}

function dateInEastern(date: Date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}
