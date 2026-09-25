'use client';

import {useEffect, useState} from 'react';
import styles from './AppConnectivityBanner.module.css';

export function AppConnectivityBanner() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  if (online) return null;

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <strong>Offline</strong>
      <span>Live updates and submissions are paused.</span>
    </div>
  );
}
