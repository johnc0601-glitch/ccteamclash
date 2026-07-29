import {PlayerActions} from '@/components/players/PlayerActions';
import {StatusBadge} from '@/components/players/StatusBadge';
import {formatPlayerPdgaNumber, formatPlayerRating} from '@/components/players/playerDisplay';
import type {Player} from '@/models/Player';
import styles from './PlayerManagement.module.css';

type PlayerRowProps = {
  player: Player;
  teamName: string;
  matchesPlayed: number;
  finalsQualified: boolean;
  onView: (player: Player) => void;
  onEdit: (player: Player) => void;
  onArchive: (player: Player) => void;
  onDelete: (player: Player) => void;
};

export function PlayerRow({
  player,
  teamName,
  matchesPlayed,
  finalsQualified,
  onView,
  onEdit,
  onArchive,
  onDelete,
}: PlayerRowProps) {
  return (
    <tr>
      <td>
        <button type="button" className={styles.playerNameButton} onClick={() => onView(player)}>
          {player.name}
        </button>
        <span className={styles.playerMeta}>PDGA {formatPlayerPdgaNumber(player)} · {formatPlayerRating(player)}</span>
      </td>
      <td>{teamName}</td>
      <td><strong>{matchesPlayed}</strong></td>
      <td>
        {finalsQualified ? (
          <span className={styles.qualified}>
            <span aria-hidden="true">&#10003;</span> Qualified
          </span>
        ) : <span className={styles.notQualified}>Not yet</span>}
      </td>
      <td>{player.gender}</td>
      <td><StatusBadge active={player.active} /></td>
      <td>
        <PlayerActions
          player={player}
          onView={onView}
          onEdit={onEdit}
          onArchive={onArchive}
          onDelete={onDelete}
        />
      </td>
    </tr>
  );
}
