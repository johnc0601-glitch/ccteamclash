import Link from 'next/link';
import type {CSSProperties} from 'react';
import type {MatchResult} from '@/domain/results/MatchResult';
import type {Match} from '@/domain/schedule/Match';
import type {PersonalAttendance} from '@/domain/match-roster/MatchAttendance';
import type {PublicMatchday} from '@/services/matches/MatchdayService';
import type {PublicMatchPrediction} from '@/services/teamStrength/PublicMatchPrediction';
import {getPwaMatchdayPhaseCopy, resolvePwaMatchdayPhase} from '@/components/matches/PwaMatchdayPhase';
import styles from './PwaMatchdayHub.module.css';

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
  const phase = resolvePwaMatchdayPhase(match, Boolean(result));
  const phaseCopy = getPwaMatchdayPhaseCopy(phase);
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

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase();
}
