type Player = {id: string; name: string; clashIndex?: number | null};
type Result = {player_id: string; opponent_team_name: string; outcome: 'W' | 'L' | 'T'};

export function selectSwingPlayer(roster: Player[], opponent: string, results: Result[]) {
  const candidates = roster.map((player) => {
    const rows = results.filter((row) => row.player_id === player.id
      && normalize(row.opponent_team_name) === normalize(opponent));
    const wins = rows.filter((row) => row.outcome === 'W').length;
    const losses = rows.filter((row) => row.outcome === 'L').length;
    const ties = rows.filter((row) => row.outcome === 'T').length;
    const tier = wins > 0 && losses === 0 ? 0 : rows.length ? 1 : 2;
    return {...player, wins, losses, ties, tier,
      rate: rows.length ? (wins + ties * .5) / rows.length : 0};
  });
  // Prefer an unbeaten opponent record, then a proven opponent record, then a
  // current-roster player with no history. Lower CI is a preference, not a cutoff.
  return candidates.sort((a, b) => a.tier - b.tier
    || (a.tier === 1 ? b.rate - a.rate : 0)
    || (a.clashIndex ?? Infinity) - (b.clashIndex ?? Infinity)
    || b.wins - a.wins || a.name.localeCompare(b.name))[0];
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function selectProvenPlayer(roster: Player[], results: Result[], excludedId?: string) {
  return roster.filter((player) => player.id !== excludedId)
    .map((player) => ({...player,
      wins: results.filter((row) => row.player_id === player.id && row.outcome === 'W').length,
    }))
    .filter((player) => player.wins > 0)
    .sort((a, b) => b.wins - a.wins || a.name.localeCompare(b.name))[0];
}
