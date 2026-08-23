import type {MatchResult, ResultContest} from '@/domain/results/MatchResult';
import type {PublicMatchday} from '@/services/matches/MatchdayService';
import styles from '@/app/matches/[id]/MatchdayV1.module.css';

export function MatchScoreboard({
  matchday,
  result,
  contests = [],
}: {
  matchday: PublicMatchday;
  result: MatchResult | undefined;
  contests?: ResultContest[];
}) {
  const awayScore = result?.awayScore ?? '—';
  const homeScore = result?.homeScore ?? '—';
  const singles = contests.filter((contest) => contest.format === 'Singles').sort((a, b) => a.position - b.position);
  const doubles = contests.filter((contest) => contest.format === 'Doubles').sort((a, b) => a.position - b.position);

  return (
    <section className={styles.scoreCard} aria-label="Match scoring">
      <div className={styles.scoreTop}>
        <div className={styles.teamScore}>
          <span className={styles.teamName}>{matchday.awayTeam.name}</span>
          <strong className={styles.scoreValue}>{awayScore}</strong>
        </div>
        <span className={styles.scoreMiddle}>VS</span>
        <div className={styles.teamScore}>
          <span className={styles.teamName}>{matchday.homeTeam.name}</span>
          <strong className={styles.scoreValue}>{homeScore}</strong>
        </div>
      </div>

      <details className={styles.scoreDetails}>
        <summary>{result ? 'View full scoring' : 'Scoring'}</summary>
        {result ? (
          <div className={styles.scoreSheet}>
            <ContestSection title="Singles" contests={singles} />
            <ContestSection title="Doubles" contests={doubles} />
            <div className={styles.finalBand}>
              <span>Final</span>
              <strong>{matchday.awayTeam.name} {awayScore} · {matchday.homeTeam.name} {homeScore}</strong>
            </div>
          </div>
        ) : (
          <div className={styles.scorePlaceholder}>Official scoring will appear here after results are posted.</div>
        )}
      </details>
    </section>
  );
}

function ContestSection({title, contests}: {title: string; contests: ResultContest[]}) {
  return (
    <section className={styles.contestSection}>
      <div className={styles.contestHeading}><strong>{title}</strong><span>{contests.length} matchups</span></div>
      {contests.length ? contests.map((contest) => <ContestRow contest={contest} key={contest.id} />) : <p className={styles.scoreEmpty}>No {title.toLowerCase()} details were published.</p>}
    </section>
  );
}

function ContestRow({contest}: {contest: ResultContest}) {
  const awayPlayers = contest.players.filter((player) => player.side === 'Away').sort((a, b) => a.slot - b.slot);
  const homePlayers = contest.players.filter((player) => player.side === 'Home').sort((a, b) => a.slot - b.slot);
  const awayWon = contest.awayOutcome === 'W';
  const homeWon = contest.homeOutcome === 'W';
  const score = contest.format === 'Singles' && contest.awayScore !== null && contest.homeScore !== null
    ? `${contest.awayScore}/${contest.homeScore}`
    : contest.awayOutcome === 'T' ? 'T' : `${contest.awayOutcome}/${contest.homeOutcome}`;

  return (
    <div className={styles.contestRow}>
      <div className={awayWon ? styles.winner : undefined}>{awayPlayers.map((player) => player.playerName).join(' / ')}</div>
      <strong className={styles.contestScore}>{score}</strong>
      <div className={homeWon ? styles.winner : undefined}>{homePlayers.map((player) => player.playerName).join(' / ')}</div>
    </div>
  );
}
