'use client';

import {useEffect, useRef, useState} from 'react';
import {saveRosterPlayerRegistration} from './actions';
import styles from './Captain.module.css';

type CaptainPlayerEditFormProps = {
  playerId: string;
  name: string;
  pdgaNumber: string;
  gender: 'Male' | 'Female' | 'Unknown';
  isJunior: boolean;
};

export function CaptainPlayerEditForm({playerId, name, pdgaNumber, gender, isJunior}: CaptainPlayerEditFormProps) {
  const [dirty, setDirty] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const reopeningRef = useRef(false);

  useEffect(() => {
    if (!dirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirty]);

  function markDirty() {
    setDirty(true);
  }

  function handleToggle() {
    const details = detailsRef.current;
    if (!details || details.open || !dirty || reopeningRef.current) return;
    const discard = window.confirm('You have unsaved player changes. Close without saving?');
    if (!discard) {
      reopeningRef.current = true;
      details.open = true;
      window.setTimeout(() => {
        reopeningRef.current = false;
      }, 0);
      return;
    }
    setDirty(false);
  }

  return (
    <details ref={detailsRef} onToggle={handleToggle} className={styles.editDetails}>
      <summary>Edit registration</summary>
      <form action={saveRosterPlayerRegistration} className={styles.editForm} onChange={markDirty} onSubmit={() => setDirty(false)}>
        <input name="playerId" type="hidden" value={playerId} />
        <label className={styles.editField}>
          <span>Player name</span>
          <input name="name" type="text" required maxLength={100} defaultValue={name} />
        </label>
        <label className={styles.editField}>
          <span>PDGA #</span>
          <input name="pdgaNumber" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={10} defaultValue={pdgaNumber} />
        </label>
        <label className={styles.editField}>
          <span>Male / Female</span>
          <select name="gender" required defaultValue={gender === 'Male' || gender === 'Female' ? gender : ''}>
            <option value="" disabled>Choose</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </label>
        <label className={styles.juniorField}>
          <input name="isJunior" type="checkbox" value="true" defaultChecked={isJunior} />
          <input name="isJunior" type="hidden" value="false" />
          <span>Junior</span>
        </label>
        {dirty ? <p className={styles.unsavedNote}>Unsaved changes — save before leaving.</p> : null}
        <button className={styles.primaryButton} type="submit">{dirty ? 'Save changes' : 'Save player'}</button>
      </form>
    </details>
  );
}
