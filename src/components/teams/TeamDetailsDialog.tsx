import type {Team} from '@/models/Team';
import {DialogShell} from '@/components/teams/DialogShell';
import {StatusBadge} from '@/components/teams/StatusBadge';
import {TeamLogo} from '@/components/teams/TeamLogo';
import {formatTeamLocation} from '@/components/teams/teamDisplay';
import styles from './TeamManagement.module.css';

type TeamDetailsDialogProps = {
  team: Team;
  onEdit: (team: Team) => void;
  onClose: () => void;
};

export function TeamDetailsDialog({team, onEdit, onClose}: TeamDetailsDialogProps) {
  return (
    <DialogShell title={team.name} eyebrow="Team details" onClose={onClose}>
      <div className={styles.detailsBody}>
        <div className={styles.detailsLead}>
          <TeamLogo team={team} large />
          <div>
            <StatusBadge active={team.active} />
            <p>{team.description || 'No team description has been added.'}</p>
          </div>
        </div>
        <dl className={styles.detailsGrid}>
          <div><dt>Short name</dt><dd>{team.shortName}</dd></div>
          <div><dt>Captain</dt><dd>{team.captain || 'Not assigned'}</dd></div>
          <div><dt>Location</dt><dd>{formatTeamLocation(team)}</dd></div>
          <div><dt>Home course</dt><dd>{team.homeCourse || 'Not assigned'}</dd></div>
          <div><dt>Website</dt><dd>{team.website ? <a href={team.website} target="_blank" rel="noreferrer">Visit website</a> : 'Not added'}</dd></div>
          <div><dt>Facebook</dt><dd>{team.facebook ? <a href={team.facebook} target="_blank" rel="noreferrer">View Facebook</a> : 'Not added'}</dd></div>
        </dl>
        <div className={styles.dialogActions}>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>Close</button>
          <button type="button" className={styles.primaryButton} onClick={() => onEdit(team)}>Edit team</button>
        </div>
      </div>
    </DialogShell>
  );
}
