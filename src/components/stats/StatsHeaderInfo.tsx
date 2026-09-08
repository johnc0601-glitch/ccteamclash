'use client';

import {useEffect, useRef, useState} from 'react';
import styles from './StatsHeaderInfo.module.css';

type StatsHeaderInfoProps = {
  label: string;
  text: string;
};

export function StatsHeaderInfo({label, text}: StatsHeaderInfoProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsidePointer(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return (
    <span ref={rootRef} className={styles.root} data-open={open ? 'true' : 'false'}>
      <button
        type="button"
        className={styles.button}
        aria-label={`About ${label}`}
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        i
      </button>
      <span className={styles.popup} role="tooltip">{text}</span>
    </span>
  );
}
