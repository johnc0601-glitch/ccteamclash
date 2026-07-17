const DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  timeZone: 'UTC',
});

export function formatSeasonDate(value: string): string {
  if (!value) return 'Not scheduled';
  return DATE_FORMATTER.format(new Date(`${value}T00:00:00.000Z`));
}
