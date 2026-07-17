'use client';

import {useEffect, useRef, type ReactNode, type SyntheticEvent} from 'react';
import styles from './TeamManagement.module.css';

type DialogShellProps = {
  title: string;
  eyebrow: string;
  children: ReactNode;
  onClose: () => void;
  size?: 'default' | 'large' | 'small';
};

export function DialogShell({title, eyebrow, children, onClose, size = 'default'}: DialogShellProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogClassName = [
    styles.dialog,
    size === 'large' ? styles.dialogLarge : '',
    size === 'small' ? styles.dialogSmall : '',
  ].filter(Boolean).join(' ');

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    dialog.querySelector<HTMLElement>('[data-initial-focus]')?.focus();

    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    event.preventDefault();
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className={dialogClassName}
      aria-labelledby="team-dialog-title"
      onCancel={handleCancel}
    >
      <header className={styles.dialogHeader}>
        <div>
          <span>{eyebrow}</span>
          <h2 id="team-dialog-title">{title}</h2>
        </div>
        <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close dialog" title="Close dialog">
          X
        </button>
      </header>
      {children}
    </dialog>
  );
}
