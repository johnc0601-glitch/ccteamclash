import type {AttendanceActor} from '@/domain/match-roster/MatchAttendance';
import {createClient} from '@/lib/supabase/server';
import {
  canViewMatchPrediction,
  getMatchPredictionVisibility,
} from '@/services/settings/MatchPredictionVisibility';
import type {PublicMatchPrediction} from '@/services/teamStrength/PublicMatchPrediction';
import styles from './MatchPredictionCard.module.css';

type MatchPredictionCardProps = {
  prediction: PublicMatchPrediction;
  awayTeamName: string;
  homeTeamName: string;
};

export async function MatchPredictionCard({
  prediction,
  awayTeamName,
  homeTeamName,
}: MatchPredictionCardProps) {
  if (!(await canCurrentViewerSeePrediction())) return null;

  return (
    <section className={styles.card} aria-label="Match forecast">
      <div className={styles.header}>
        <div>
          <span>Match forecast</span>
          <h2>{prediction.stageLabel}</h2>
        </div>
        <span className={styles.badge}>{prediction.displayLabel}</span>
      </div>

      {prediction.state === 'waiting' ? (
        <div className={styles.message}>
          <strong>Forecast is updating</strong>
          <p>{prediction.detail}</p>
        </div>
      ) : (
        <CalculatedForecast
          prediction={prediction}
          awayTeamName={awayTeamName}
          homeTeamName={homeTeamName}
        />
      )}

      <div className={styles.footer}>
        {prediction.state === 'calculated' ? <span>{prediction.venueNote}</span> : null}
        <span>{prediction.updateNote}</span>
      </div>
    </section>
  );
}

async function canCurrentViewerSeePrediction() {
  const supabase = await createClient();
  const visibility = await getMatchPredictionVisibility(supabase);
  if (visibility === 'Public') return true;

  const {data: {user}} = await supabase.auth.getUser();
  if (!user) return false;

  const {data: profile, error} = await supabase
    .from('launch_profiles')
    .select('role,status')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Match prediction viewer role is unavailable.', {error: error.message});
    return false;
  }
  if (!profile) return false;

  return canViewMatchPrediction(visibility, {
    profileRole: profile.role as AttendanceActor['profileRole'],
    profileStatus: profile.status as AttendanceActor['profileStatus'],
  });
}

function CalculatedForecast({
  prediction,
  awayTeamName,
  homeTeamName,
}: {
  prediction: Extract<PublicMatchPrediction, {state: 'calculated'}>;
  awayTeamName: string;
  homeTeamName: string;
}) {
  if (
    prediction.awayChanceOfVictory == null
    || prediction.homeChanceOfVictory == null
  ) {
    return (
      <div className={styles.message}>
        <strong>Prediction unavailable</strong>
        <p>Roster data is incomplete, so no percentage is being published.</p>
      </div>
    );
  }

  const homePercent = Math.round(prediction.homeChanceOfVictory * 100);
  const awayPercent = 100 - homePercent;

  return (
    <>
      <div className={styles.teams}>
        <TeamForecast
          side="Away"
          teamName={awayTeamName}
          percent={awayPercent}
          strengthLabel={prediction.strengthLabel}
          strength={prediction.awayStrength}
        />
        <div className={styles.divider}>VS</div>
        <TeamForecast
          side="Home"
          teamName={homeTeamName}
          percent={homePercent}
          strengthLabel={prediction.strengthLabel}
          strength={prediction.homeStrength}
          align="right"
        />
      </div>

      <div
        className={styles.probabilityBar}
        aria-label={`${awayTeamName} ${awayPercent}% chance of victory; ${homeTeamName} ${homePercent}% chance of victory`}
      >
        <span className={styles.awayBar} style={{width: `${awayPercent}%`}} />
        <span className={styles.homeBar} style={{width: `${homePercent}%`}} />
      </div>
    </>
  );
}

function TeamForecast({
  side,
  teamName,
  percent,
  strengthLabel,
  strength,
  align = 'left',
}: {
  side: 'Away' | 'Home';
  teamName: string;
  percent: number;
  strengthLabel: string;
  strength: number;
  align?: 'left' | 'right';
}) {
  return (
    <div className={styles.team} data-align={align}>
      <span>{side}</span>
      <strong>{teamName}</strong>
      <b>{percent}%</b>
      <small>{strengthLabel}: {Math.round(strength)}</small>
    </div>
  );
}
