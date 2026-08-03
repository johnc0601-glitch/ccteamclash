import styles from '@/app/matches/[id]/Matchday.module.css';

export function MatchPermissionNotice({
  title = 'Match tools unavailable',
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <section className={styles.permissionNotice} aria-label={title}>
      <span>{title}</span>
      <p>{message}</p>
    </section>
  );
}
