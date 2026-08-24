import Link from 'next/link';
import styles from './HomeCommentFeed.module.css';

export type HomeCommentFeedItem = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  matchLabel: string;
  matchHref: string;
};

type HomeCommentFeedProps = {
  items: HomeCommentFeedItem[];
};

export function HomeCommentFeed({items}: HomeCommentFeedProps) {
  return (
    <section className={`shell ${styles.section}`} hidden>
      <div className={styles.panel}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Buzz</span>
          </div>
          <p>Latest comments and replies from match pages across Coastal Clash.</p>
        </header>

        {items.length ? (
          <div className={styles.feed}>
            {items.map((item) => (
              <Link key={item.id} href={`${item.matchHref}#match-feed`} className={styles.item}>
                <div className={styles.top}>
                  <span className={styles.author}>{item.author}</span>
                  <span className={styles.time}>{formatActivityTime(item.createdAt)}</span>
                </div>
                <p className={styles.body}>{item.body}</p>
                <div className={styles.match}>
                  <span>{item.matchLabel}</span>
                  <span className={styles.arrow}>-&gt;</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className={styles.empty}>Match comments will appear here when the conversation starts.</div>
        )}
      </div>
    </section>
  );
}

function formatActivityTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}
