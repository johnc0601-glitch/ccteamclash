import type {MatchdayLifecycle} from '@/services/matches/MatchdayService';
import styles from '@/app/matches/[id]/Matchday.module.css';

const STATE_COPY: Record<MatchdayLifecycle, {title: string; detail: string}> = {
  Scheduled: {
    title: 'Match scheduled',
    detail: 'The active team rosters are shown below. Match attendance opens in a later update.',
  },
  Completed: {
    title: 'Final result published',
    detail: 'The commissioner-approved final score is available for this match.',
  },
  Postponed: {
    title: 'Match postponed',
    detail: 'Check the schedule for an updated match date and time.',
  },
  Cancelled: {
    title: 'Match cancelled',
    detail: 'This match is no longer scheduled to be played.',
  },
  'Rain Delay': {
    title: 'Rain delay',
    detail: 'Match timing may change. Check the schedule for the latest information.',
  },
};

export function MatchStateBanner({lifecycle}: {lifecycle: MatchdayLifecycle}) {
  const copy = STATE_COPY[lifecycle];
  return (
    <section className={styles.stateBanner} data-state={lifecycle}>
      <span>{lifecycle}</span>
      <div>
        <h2>{copy.title}</h2>
        <p>{copy.detail}</p>
      </div>
    </section>
  );
}
