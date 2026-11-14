import type {AttendanceActor} from '@/domain/match-roster/MatchAttendance';
import {canViewMatchPrediction} from '@/services/settings/MatchPredictionVisibility';
import type {PublicMatchPrediction} from '@/services/teamStrength/PublicMatchPrediction';
import styles from './MatchPredictionCard.module.css';

type Props = {
  actor: Pick<AttendanceActor, 'profileRole' | 'profileStatus'> | undefined;
  prediction: PublicMatchPrediction;
  awayTeamName: string;
  homeTeamName: string;
  awayLogo?: string;
  homeLogo?: string;
};

export function MatchPredictionCard({actor, prediction, awayTeamName, homeTeamName, awayLogo, homeLogo}: Props) {
  if (!canViewMatchPrediction('CaptainsCommissioner', actor)) return null;
  const probability = prediction.state === 'calculated' ? prediction.homeChanceOfVictory : null;
  const home = probability == null ? null : Math.round(Math.min(.95, Math.max(.05, probability)) * 100);
  const away = home == null ? null : 100 - home;
  const angle = away == null ? -90 : -180 + away * 1.8;
  const radians = angle * Math.PI / 180;
  return (
    <section className={styles.card} aria-label="CI Model Estimates">
      <h2>CI Model Estimates</h2>
      {home == null || away == null ? <p>{prediction.state === 'waiting' ? prediction.detail : 'Roster data is incomplete. Estimate unavailable.'}</p> : <>
        <div className={styles.gauge} role="img" aria-label={`${awayTeamName} ${away}%; ${homeTeamName} ${home}%`}>
          <svg viewBox="0 0 320 172" aria-hidden="true">
            <path d="M 30 155 A 130 130 0 0 1 290 155" className={styles.rim} />
            <path d="M 30 155 A 130 130 0 0 1 290 155" pathLength="100" className={styles.homeArc} />
            <path d="M 30 155 A 130 130 0 0 1 290 155" pathLength="100" strokeDasharray={`${away} ${home}`} className={styles.awayArc} />
            {Array.from({length: 21}, (_, i) => {
              const tick = Math.PI + i * Math.PI / 20;
              const radius = i % 5 === 0 ? 104 : 110;
              return <line key={i} x1={160 + radius * Math.cos(tick)} y1={155 + radius * Math.sin(tick)} x2={160 + 116 * Math.cos(tick)} y2={155 + 116 * Math.sin(tick)} className={styles.tick} />;
            })}
            <line x1={160 + 120 * Math.cos(radians)} y1={155 + 120 * Math.sin(radians)} x2={160 + 140 * Math.cos(radians)} y2={155 + 140 * Math.sin(radians)} className={styles.needle} />
          </svg>
          <div className={styles.center}><strong>{Math.max(home, away)}%</strong><span>{home === away ? 'Even matchup' : home > away ? homeTeamName : awayTeamName}</span></div>
        </div>
        <div className={styles.teams}>
          <div>{awayLogo ? <img src={awayLogo} alt="" width="44" height="44" /> : null}<strong>{awayTeamName}</strong><span>{away}%</span></div>
          <div>{homeLogo ? <img src={homeLogo} alt="" width="44" height="44" /> : null}<strong>{homeTeamName}</strong><span>{home}%</span></div>
        </div>
      </>}
    </section>
  );
}
