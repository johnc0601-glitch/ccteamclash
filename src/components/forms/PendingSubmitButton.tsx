'use client';

import type {ButtonHTMLAttributes, ReactNode} from 'react';
import {useFormStatus} from 'react-dom';
import {getPendingButtonState} from './pendingButtonState';

export type PendingSubmitButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'type'> & {
  children: ReactNode;
  pendingLabel: string;
  pendingWhen?: {name: string; value: string};
};

export function PendingSubmitButton({
  children,
  disabled = false,
  pendingLabel,
  pendingWhen,
  ...props
}: PendingSubmitButtonProps) {
  const {data, pending} = useFormStatus();
  const showPendingLabel = pending && (
    !pendingWhen || data?.get(pendingWhen.name) === pendingWhen.value
  );
  const state = getPendingButtonState(
    disabled,
    pending,
    showPendingLabel,
    String(children),
    pendingLabel,
  );

  return (
    <button {...props} aria-disabled={state.disabled} disabled={state.disabled} type="submit">
      {showPendingLabel ? state.label : children}
    </button>
  );
}
