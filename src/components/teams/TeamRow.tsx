import type {Team} from '@/models/Team';
import {StatusBadge} from '@/components/teams/StatusBadge';
import {TeamActions} from '@/components/teams/TeamActions';
import {TeamLogo} from '@/components/teams/TeamLogo';
import {formatTeamLocation} from '@/components/teams/teamDisplay';
import styles from './TeamManagement.module.css';

type TeamRowProps = {
  team: Team;
  onView: (team: Team) => void;
  onEdit: (team: Team) => void;
  onArchive: (team: Team) => void;
  onDelete: (team: Team) => void;
};

export function TeamRow({team, onView, onEdit, onArchive, onDelete}: TeamRowProps) {
  return (
    <tr>
      <td><TeamLogo team={team} /></td>
      <td>
        <button type="button" className={styles.teamNameButton} onClick={() => onView(team)}>
          {team.name}
        </button>
        <span className={styles.teamLocation}>{formatTeamLocation(team)}</span>
      </td>
      <td>{team.captain || 'Not assigned'}</td>
      <td>{team.homeCourse || 'Not assigned'}</td>
      <td><StatusBadge active={team.active} /></td>
      <td>
        <TeamActions
          team={team}
          onView={onView}
          onEdit={onEdit}
          onArchive={onArchive}
          onDelete={onDelete}
        />
      </td>
    </tr>
  );
}
