import type {PublicMatchPrediction} from '@/services/teamStrength/PublicMatchPrediction';
import styles from './MatchPredictionCard.module.css';

type MatchPredictionCardProps = {
  prediction: PublicMatchPrediction;
  awayTeamName: string;
  homeTeamName: string;
};

export function MatchPredictionCard({
  prediction,
  awayTeamName,
  homeTeamName,
}: MatchPredictionCardProps) {
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
          strengthLabel={prediction.stageLabel}
          strength={prediction.awayStrength}
        />
        <div className={styles.divider}>VS</div>
        <TeamForecast
          side="Home"
          teamName={homeTeamName}
          percent={homePercent}
          strengthLabel={prediction.stageLabel}
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
