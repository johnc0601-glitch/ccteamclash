type Meeting = {away_team_name: string; home_team_name: string; away_score: number; home_score: number};

export function buildMatchSeries(away: string, home: string, matches: Meeting[]) {
  const a = normalize(away);
  const h = normalize(home);
  let awayWins = 0;
  let homeWins = 0;
  let ties = 0;
  for (const match of matches) {
    const first = normalize(match.away_team_name);
    const second = normalize(match.home_team_name);
    if (!((first === a && second === h) || (first === h && second === a))) continue;
    if (match.away_score === match.home_score) { ties++; continue; }
    const winner = match.away_score > match.home_score ? first : second;
    if (winner === a) awayWins++; else homeWins++;
  }
  if (!awayWins && !homeWins && !ties) return 'First meeting';
  const suffix = ties ? ` · ${ties} tied` : '';
  if (awayWins === homeWins) return `Series tied ${awayWins}–${homeWins}${suffix}`;
  const leader = awayWins > homeWins ? away : home;
  return `${leader} leads ${Math.max(awayWins, homeWins)}–${Math.min(awayWins, homeWins)}${suffix}`;
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
