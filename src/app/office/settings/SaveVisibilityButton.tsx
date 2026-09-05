'use client';

import {useFormStatus} from 'react-dom';
import styles from './Settings.module.css';

export function SaveVisibilityButton() {
  const {pending} = useFormStatus();

  return (
    <button
      className={styles.saveButton}
      type="submit"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? 'Saving…' : 'Save visibility'}
    </button>
  );
}
