import type {MatchResult} from '@/domain/results/MatchResult';
import {
  resolveMatchdayScoreboard,
  type PublicMatchday,
} from '@/services/matches/MatchdayService';
import styles from '@/app/matches/[id]/Matchday.module.css';

export function MatchScoreboard({
  matchday,
  result,
}: {
  matchday: PublicMatchday;
  result: MatchResult | undefined;
}) {
  const scoreboard = resolveMatchdayScoreboard(matchday, result);
  return (
    <section className={styles.scoreboard}>
      <span>Scoreboard</span>
      <h2>{scoreboard.heading}</h2>
      <p>{scoreboard.detail}</p>
    </section>
  );
}
