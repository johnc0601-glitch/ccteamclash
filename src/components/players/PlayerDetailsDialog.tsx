import {DialogShell} from '@/components/teams/DialogShell';
import {StatusBadge} from '@/components/players/StatusBadge';
import {formatPlayerPdgaNumber, formatPlayerRating} from '@/components/players/playerDisplay';
import type {Player} from '@/models/Player';
import styles from './PlayerManagement.module.css';

type PlayerDetailsDialogProps = {
  player: Player;
  teamName: string;
  matchesPlayed: number;
  finalsQualified: boolean;
  onEdit: (player: Player) => void;
  onClose: () => void;
};

export function PlayerDetailsDialog({
  player,
  teamName,
  matchesPlayed,
  finalsQualified,
  onEdit,
  onClose,
}: PlayerDetailsDialogProps) {
  return (
    <DialogShell
      title={player.name}
      eyebrow="Player details"
      size="large"
      onClose={onClose}
    >
      <div className={styles.detailsBody}>
        <div className={styles.detailsLead}>
          <div className={styles.playerAvatarLarge} aria-hidden="true">{player.name.slice(0, 2).toUpperCase()}</div>
          <div>
            <StatusBadge active={player.active} />
            <p>{teamName} player record for Commissioner Office management.</p>
          </div>
        </div>
        <dl className={styles.detailsGrid}>
          <div><dt>Team</dt><dd>{teamName}</dd></div>
          <div><dt>Gender</dt><dd>{player.gender}</dd></div>
          <div><dt>PDGA Number</dt><dd>{formatPlayerPdgaNumber(player)}</dd></div>
          <div><dt>PDGA Rating</dt><dd>{formatPlayerRating(player)}</dd></div>
          <div><dt>Season Matches</dt><dd>{matchesPlayed}</dd></div>
          <div><dt>Finals</dt><dd>{finalsQualified ? 'Qualified' : 'Not yet'}</dd></div>
          <div><dt>Created</dt><dd>{new Date(player.createdAt).toLocaleDateString()}</dd></div>
          <div><dt>Updated</dt><dd>{new Date(player.updatedAt).toLocaleDateString()}</dd></div>
        </dl>
        <div className={styles.formActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>Close</button>
          <button type="button" className={styles.primaryButton} onClick={() => onEdit(player)}>Edit player</button>
        </div>
      </div>
    </DialogShell>
  );
}
