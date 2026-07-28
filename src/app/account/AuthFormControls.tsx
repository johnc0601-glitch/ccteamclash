'use client';

import {useId, useState} from 'react';
import {useFormStatus} from 'react-dom';
import styles from './Account.module.css';

type PasswordFieldProps = {
  autoComplete: 'current-password' | 'new-password';
  id: string;
  label: string;
  minLength?: number;
  name: string;
};

export function PasswordField({
  autoComplete,
  id,
  label,
  minLength,
  name,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const descriptionId = useId();

  return (
    <div className={styles.passwordField}>
      <div className={styles.passwordLabel}>
        <label htmlFor={id}>{label}</label>
        <button
          aria-controls={id}
          aria-pressed={visible}
          className={styles.passwordToggle}
          onClick={() => setVisible((current) => !current)}
          type="button"
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
      <input
        aria-describedby={minLength ? descriptionId : undefined}
        autoComplete={autoComplete}
        id={id}
        minLength={minLength}
        name={name}
        required
        type={visible ? 'text' : 'password'}
      />
      {minLength ? <span className={styles.fieldHint} id={descriptionId}>At least {minLength} characters.</span> : null}
    </div>
  );
}

export function SubmitButton({
  children,
  pendingLabel,
  secondary = false,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  secondary?: boolean;
}) {
  const {pending} = useFormStatus();

  return (
    <button
      className={secondary ? styles.secondaryButton : styles.primaryButton}
      disabled={pending}
      type="submit"
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
