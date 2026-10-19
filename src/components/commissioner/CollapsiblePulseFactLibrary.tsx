'use client';

import {useState} from 'react';
import {PulseFactLibrary} from '@/components/commissioner/PulseFactLibrary';
import styles from './CollapsiblePulseFactLibrary.module.css';

/**
 * The full fact review grid is intentionally opt-in. Mount the library only
 * after opening it so the Office page does not fetch or render hundreds of
 * facts during routine Clash Pulse publishing.
 */
export function CollapsiblePulseFactLibrary({readOnly = false}: {readOnly?: boolean}) {
  const [open, setOpen] = useState(false);

  return (
    <section className={styles.shell} aria-label="Advanced Clash Pulse fact library">
      <button
        className={styles.toggle}
        type="button"
        onClick={() => setOpen(current => !current)}
        aria-expanded={open}
        aria-controls="clash-pulse-advanced-library"
      >
        <span className={styles.description}>
          <strong>{readOnly ? 'Advanced source facts (optional)' : 'Advanced fact library'}</strong>
          <span>{readOnly ? 'Raw supporting facts and calculations, hidden until needed' : 'Full round research, source details and manual fact review'}</span>
        </span>
        <span className={styles.indicator} aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      <div id="clash-pulse-advanced-library">
        {open ? <PulseFactLibrary readOnly={readOnly} /> : null}
      </div>
    </section>
  );
}
