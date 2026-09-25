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
  appBackHref?: string;
  appBackLabel?: string;
};

export function AccountPageLayout({
  children,
  description,
  error,
  eyebrow = 'League account',
  narrow = false,
  notice,
  title,
  appBackHref,
  appBackLabel = 'Me',
}: AccountPageLayoutProps) {
  return (
    <main>
      <SiteHeader />
      <section className={styles.shell}>
        <div className={`shell ${narrow ? styles.narrowShell : ''}`}>
          {appBackHref ? (
            <header className={styles.appSubHeader}>
              <Link href={appBackHref}>← {appBackLabel}</Link>
              <div>
                <span>{eyebrow}</span>
                <strong>{title}</strong>
              </div>
            </header>
          ) : null}
          <header className={appBackHref ? `${styles.header} ${styles.browserAccountHeader}` : styles.header}>
            <span className={styles.eyebrow}>{eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
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
