import Link from 'next/link';
import {Footer, SiteHeader} from '@/components/SiteHeader';
import styles from './Account.module.css';

type AccountPageLayoutProps = {
  children: React.ReactNode;
  description: string;
  error?: string;
  eyebrow?: string;
  narrow?: boolean;
  notice?: string;
  title: string;
};

export function AccountPageLayout({
  children,
  description,
  error,
  eyebrow = 'League account',
  narrow = false,
  notice,
  title,
}: AccountPageLayoutProps) {
  return (
    <main>
      <SiteHeader />
      <section className={styles.shell}>
        <div className={`shell ${narrow ? styles.narrowShell : ''}`}>
          <header className={styles.header}>
            <span className={styles.eyebrow}>{eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
            <Link className={styles.secondaryActionLink} href="/account/free-agency">Looking for a team? Free Agency</Link>
          </header>
          {notice ? <p className={styles.notice}>{notice}</p> : null}
          {error ? <p className={styles.error}>{error}</p> : null}
          {children}
        </div>
      </section>
      <Footer />
    </main>
  );
}

export function readAccountParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
