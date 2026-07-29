import type {Player} from '@/models/Player';
import styles from './PlayerManagement.module.css';

type PlayerActionsProps = {
  player: Player;
  onView: (player: Player) => void;
  onEdit: (player: Player) => void;
  onArchive: (player: Player) => void;
  onDelete: (player: Player) => void;
};

export function PlayerActions({
  player,
  onView,
  onEdit,
  onArchive,
  onDelete,
}: PlayerActionsProps) {
  return (
    <div className={styles.playerActions}>
      <button type="button" onClick={() => onView(player)}>View</button>
      <button type="button" onClick={() => onEdit(player)}>Edit</button>
      {player.active ? <button type="button" onClick={() => onArchive(player)}>Archive</button> : null}
      <button type="button" className={styles.dangerText} onClick={() => onDelete(player)}>Delete</button>
    </div>
  );
}
