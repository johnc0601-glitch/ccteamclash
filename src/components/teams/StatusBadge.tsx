import styles from './TeamManagement.module.css';

type StatusBadgeProps = {
  active: boolean;
};

export function StatusBadge({active}: StatusBadgeProps) {
  return (
    <span className={active ? styles.statusActive : styles.statusArchived}>
      {active ? 'Active' : 'Archived'}
    </span>
  );
}
