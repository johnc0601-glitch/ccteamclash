import type {Team} from '@/models/Team';
import styles from './TeamManagement.module.css';

type TeamActionsProps = {
  team: Team;
  onView: (team: Team) => void;
  onEdit: (team: Team) => void;
  onArchive: (team: Team) => void;
  onDelete: (team: Team) => void;
};

export function TeamActions({team, onView, onEdit, onArchive, onDelete}: TeamActionsProps) {
  return (
    <div className={styles.teamActions}>
      <button type="button" onClick={() => onView(team)}>View</button>
      <button type="button" onClick={() => onEdit(team)}>Edit</button>
      {team.active ? (
        <button type="button" onClick={() => onArchive(team)}>Archive</button>
      ) : null}
      <button type="button" className={styles.dangerText} onClick={() => onDelete(team)}>Delete</button>
    </div>
  );
}
