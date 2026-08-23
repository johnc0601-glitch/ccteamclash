export type ClashIndexSource = 'Established' | 'GhostAverage';

export function isGhostCi(source: ClashIndexSource): boolean {
  return source === 'GhostAverage';
}

/** Player-facing convention: averaged starting CI carries an asterisk. */
export function formatClashIndex(value: number, source: ClashIndexSource): string {
  return `${Math.round(value)}${isGhostCi(source) ? '*' : ''}`;
}
