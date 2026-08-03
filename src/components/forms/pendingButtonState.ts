export function getPendingButtonState(
  disabled: boolean,
  submissionPending: boolean,
  showPendingLabel: boolean,
  label: string,
  pendingLabel: string,
): {disabled: boolean; label: string} {
  return {
    disabled: disabled || submissionPending,
    label: showPendingLabel ? pendingLabel : label,
  };
}
