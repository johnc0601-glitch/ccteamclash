import type {Team} from '@/models/Team';
import {StatusBadge} from '@/components/teams/StatusBadge';
import {TeamActions} from '@/components/teams/TeamActions';
import {TeamLogo} from '@/components/teams/TeamLogo';
import styles from './TeamManagement.module.css';

type TeamCardProps = {
  team: Team;
  onView: (team: Team) => void;
  onEdit: (team: Team) => void;
  onArchive: (team: Team) => void;
  onDelete: (team: Team) => void;
};

export function TeamCard({team, onView, onEdit, onArchive, onDelete}: TeamCardProps) {
  return (
    <article className={styles.teamCard}>
      <div className={styles.cardHeader}>
        <TeamLogo team={team} large />
        <StatusBadge active={team.active} />
      </div>
      <button type="button" className={styles.cardTitle} onClick={() => onView(team)}>{team.name}</button>
      <dl className={styles.cardFacts}>
        <div><dt>Captain</dt><dd>{team.captain || 'Not assigned'}</dd></div>
        <div><dt>Course</dt><dd>{team.homeCourse || 'Not assigned'}</dd></div>
      </dl>
      <p className={styles.cardDescription}>{team.description || 'No team description has been added.'}</p>
      <TeamActions
        team={team}
        onView={onView}
        onEdit={onEdit}
        onArchive={onArchive}
        onDelete={onDelete}
      />
    </article>
  );
}
