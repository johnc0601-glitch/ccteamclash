import {PlayerActions} from '@/components/players/PlayerActions';
import {StatusBadge} from '@/components/players/StatusBadge';
import {formatPlayerPdgaNumber, formatPlayerRating} from '@/components/players/playerDisplay';
import type {Player} from '@/models/Player';
import styles from './PlayerManagement.module.css';

type PlayerCardProps = {
  player: Player;
  teamName: string;
  matchesPlayed: number;
  finalsQualified: boolean;
  onView: (player: Player) => void;
  onEdit: (player: Player) => void;
  onArchive: (player: Player) => void;
  onDelete: (player: Player) => void;
};

export function PlayerCard({
  player,
  teamName,
  matchesPlayed,
  finalsQualified,
  onView,
  onEdit,
  onArchive,
  onDelete,
}: PlayerCardProps) {
  return (
    <article className={styles.playerCard}>
      <div className={styles.cardHeader}>
        <div className={styles.playerAvatar} aria-hidden="true">{player.name.slice(0, 2).toUpperCase()}</div>
        <StatusBadge active={player.active} />
      </div>
      <button type="button" className={styles.cardTitle} onClick={() => onView(player)}>{player.name}</button>
      <dl className={styles.cardFacts}>
        <div><dt>Team</dt><dd>{teamName}</dd></div>
        <div><dt>PDGA</dt><dd>{formatPlayerPdgaNumber(player)}</dd></div>
        <div><dt>Rating</dt><dd>{formatPlayerRating(player)}</dd></div>
        <div><dt>Season</dt><dd>{matchesPlayed} {matchesPlayed === 1 ? 'match' : 'matches'}</dd></div>
      </dl>
      <p className={styles.cardDescription}>
        {finalsQualified ? 'Finals qualified for the active season.' : 'Still building toward finals qualification.'}
      </p>
      <PlayerActions
        player={player}
        onView={onView}
        onEdit={onEdit}
        onArchive={onArchive}
        onDelete={onDelete}
      />
    </article>
  );
}
