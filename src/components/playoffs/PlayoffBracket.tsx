import Link from 'next/link';
import type {PlayoffBracketView, PlayoffGameView} from '@/domain/playoffs/Playoff';
import styles from './PlayoffBracket.module.css';

export function PlayoffBracket({view}: {view: PlayoffBracketView}) {
  const semifinals = view.games.filter((game) => game.stage === 'Semifinal');
  const championship = view.games.find((game) => game.stage === 'Championship');
  return (
    <div className={styles.bracket}>
      <section>
        <span>Semifinals</span>
        {semifinals.map((game) => <GameCard game={game} key={game.id} />)}
      </section>
      <div className={styles.connector}>→</div>
      <section>
        <span>Championship</span>
        {championship ? <GameCard game={championship} /> : null}
        {view.champion ? (
          <div className={styles.champion}>
            <span>Team Clash Champion</span>
            <strong>{view.champion.name}</strong>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function GameCard({game}: {game: PlayoffGameView}) {
  return (
    <article className={styles.game}>
      <small>{game.stage === 'Semifinal' ? `Semifinal ${game.position}` : 'Final'}</small>
      <TeamLine seed={game.homeSeed} name={game.homeTeam?.name} score={game.result?.homeScore} winner={game.winnerTeamId === game.match.homeTeamId} />
      <TeamLine seed={game.awaySeed} name={game.awayTeam?.name} score={game.result?.awayScore} winner={game.winnerTeamId === game.match.awayTeamId} />
      <Link href={game.href}>{game.result ? 'Final result' : 'Match details'} →</Link>
    </article>
  );
}

function TeamLine({seed, name, score, winner}: {seed: number | null; name?: string; score?: number | null; winner: boolean}) {
  return (
    <div className={winner ? styles.winner : undefined}>
      <b>{seed ? `#${seed}` : '—'}</b>
      <strong>{name ?? 'TBD'}</strong>
      <span>{score ?? '—'}</span>
    </div>
  );
}
