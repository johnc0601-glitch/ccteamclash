type Player = {id: string; name: string; clashIndex?: number | null};
type Result = {player_id: string; opponent_team_name: string; outcome: 'W' | 'L' | 'T'};

export function selectSwingPlayer(roster: Player[], opponent: string, results: Result[]) {
  const rated = roster.filter((player) => Number.isFinite(player.clashIndex));
  const ratings = rated.map((player) => player.clashIndex!).sort((a, b) => a - b);
  if (!ratings.length) return undefined;
  const middle = Math.floor(ratings.length / 2);
  const median = ratings.length % 2 ? ratings[middle] : (ratings[middle - 1] + ratings[middle]) / 2;
  return rated.filter((player) => player.clashIndex! <= median)
    .map((player) => {
      // Follow a current player across former teams, but only count this opponent.
      const rows = results.filter((row) => row.player_id === player.id
        && normalize(row.opponent_team_name) === normalize(opponent));
      return {...player, wins: rows.filter((row) => row.outcome === 'W').length,
        losses: rows.filter((row) => row.outcome === 'L').length,
        ties: rows.filter((row) => row.outcome === 'T').length};
    })
    .filter((player) => player.wins > 0 && player.losses === 0)
    .sort((a, b) => a.clashIndex! - b.clashIndex! || b.wins - a.wins
      || a.name.localeCompare(b.name))[0];
}

function normalize(value: string) {
  return value.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
