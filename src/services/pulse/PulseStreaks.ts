import type {PulseFact, PulseMatch, PulseRating, PulseRound, PulseSource} from './PulseFacts';

type Event = {match: PulseMatch; outcome: 'W' | 'L' | 'T' | null; opponent: string; refs: PulseFact['sources']};
const modes = [
  {name: 'winning', accepts: (o: string) => o === 'W'},
  {name: 'losing', accepts: (o: string) => o === 'L'},
  {name: 'unbeaten', accepts: (o: string) => o !== 'L'},
  {name: 'winless', accepts: (o: string) => o !== 'W'},
];

/** Season-scoped runs. Unknown events are barriers, never silently skipped results. */
export function generateStreakFacts(source: PulseSource, round: PulseRound, verified: PulseRating[]): PulseFact[] {
  const facts: PulseFact[] = [];
  const rounds = new Map(source.rounds.filter(r => r.season_id === round.season_id && r.number <= round.number).map(r => [r.id, r.number]));
  const matches = source.matches.filter(m => m.season_id === round.season_id && rounds.has(m.round_id))
    .sort((a,b) => rounds.get(a.round_id)! - rounds.get(b.round_id)! || (a.date ?? '').localeCompare(b.date ?? '') || a.id.localeCompare(b.id));
  const resultFor = (m: PulseMatch) => source.results.find(r => r.match_id === m.id && r.status === 'Published'
    && Number.isFinite(r.home_score) && Number.isFinite(r.away_score));
  const ordered = (events: Event[]) => events.map((e, i, all) => {
    // Multiple appearances need distinct recorded dates; IDs are not chronology.
    const ambiguous = all.some((other,j) => i !== j && other.match.round_id === e.match.round_id
      && (!other.match.date || !e.match.date || other.match.date === e.match.date));
    return ambiguous ? {...e, outcome: null} : e;
  });
  function scan(key: string, name: string, unit: string, events: Event[], teamIds: string[], playerIds: string[]) {
    for (const mode of modes) {
      let run: Event[] = [];
      let uncertainStart = false;
      for (const event of ordered(events)) {
        if (!event.outcome) {run = []; uncertainStart = true; continue;}
        const current = event.match.round_id === round.id;
        const continuing = mode.accepts(event.outcome);
        if (current && (continuing ? run.length + 1 >= 2 : run.length >= 2)) {
          const count = run.length + (continuing ? 1 : 0);
          const broken = !continuing;
          const length = `${uncertainStart ? 'at least ' : ''}${count}-${unit}`;
          const outcome = event.outcome === 'W' ? 'a win' : event.outcome === 'L' ? 'a loss' : 'a tie';
          const refs = [...run, event].flatMap(e => e.refs);
          facts.push({fact_key: `streak:${key}:${mode.name}:${event.match.id}`, category: broken ? 'Broken streaks' : 'Streaks',
            fact_text: broken
              ? `${name}: ${length} ${mode.name} streak ended with ${outcome} against ${event.opponent} in Round ${round.number}.`
              : `${name}: ${length} ${mode.name} streak through Round ${round.number}.`,
            match_id: event.match.id, team_ids: teamIds, player_ids: playerIds,
            sources: [...new Set(refs.map(r => r.table))].map(table => ({table, ids: [...new Set(refs.filter(r => r.table === table).flatMap(r => r.ids))].sort()})),
            calculation: `Selected season only; consecutive ${unit}s in scheduled round/date order. ${mode.name === 'unbeaten' ? 'Wins and ties qualify.' : mode.name === 'winless' ? 'Losses and ties qualify.' : 'Ties interrupt this run.'} Missing/unpublished results or ambiguous ordering interrupt runs. Player absences and unplayed awards are not appearances. At least two qualifying results required.`,
            metric: count, ranking: null});
        }
        run = continuing ? [...run,event] : [];
        if (!continuing) uncertainStart = false;
      }
    }
  }
  const currentTeams = new Set(matches.filter(m => m.round_id === round.id).flatMap(m => [m.home_team_id,m.away_team_id]));
  for (const teamId of currentTeams) {
    const teamMatches = matches.filter(m => m.home_team_id === teamId || m.away_team_id === teamId);
    const last = teamMatches.at(-1)!;
    const name = last.home_team_id === teamId ? last.home_name : last.away_name;
    const events: Event[] = teamMatches.map(match => {
      const home = match.home_team_id === teamId;
      const result = resultFor(match);
      const own = home ? result?.home_score : result?.away_score;
      const other = home ? result?.away_score : result?.home_score;
      return {match, outcome: !result ? null : own! > other! ? 'W' : own! < other! ? 'L' : 'T',
        opponent: home ? match.away_name : match.home_name,
        refs: [{table: 'launch_match_results', ids: [match.id]}, {table: 'launch_schedule_matches', ids: [match.id]}]};
    });
    scan(`team:${teamId}`, name, 'match', events, [teamId], []);
  }
  for (const playerId of new Set(verified.filter(r => matches.some(m => m.id === r.match_id && m.round_id === round.id)).map(r => r.player_id))) {
    const rows = verified.filter(r => r.player_id === playerId);
    const teamIds = [...new Set(rows.map(r => r.team_id))];
    for (const format of ['Singles','Doubles'] as const) {
      const events: Event[] = [];
      for (const match of matches.filter(m => teamIds.includes(m.home_team_id) || teamIds.includes(m.away_team_id))) {
        const played = rows.filter(r => r.match_id === match.id && r.format === format);
        const snapshot = source.snapshots.find(s => s.match_id === match.id && s.locked)?.payload;
        const result = resultFor(match);
        const validSnapshot = snapshot && result && snapshot.matchId === match.id
          && snapshot.homeTeam.id === match.home_team_id && snapshot.awayTeam.id === match.away_team_id
          && snapshot.homeScore === result.home_score && snapshot.awayScore === result.away_score;
        const entered = validSnapshot ? snapshot.contests.filter(c => c.format === format && !c.unplayed
          && [...c.homePlayers,...c.awayPlayers].some(p => p.id === playerId)) : undefined;
        // A known absence is not a result. Unknown or unreconciled participation breaks the run.
        if (resultFor(match) && entered?.length === 0) continue;
        const row = played.length === 1 && entered?.length === 1 && resultFor(match) ? played[0] : null;
        const opponents = row ? verified.filter(r => r.match_id === match.id && r.contest_id === row.contest_id && r.side !== row.side) : [];
        events.push({match, outcome: row?.outcome ?? null, opponent: opponents.map(r => r.player_name).join(' & '),
          refs: [{table: 'clash_contest_rating_facts', ids: row ? [`${row.contest_id}:${row.player_id}`] : []},
            {table: 'launch_match_final_snapshots', ids: [match.id]}, {table: 'launch_schedule_matches', ids: [match.id]}]});
      }
      scan(`player:${playerId}:${format}`, `${rows.at(-1)!.player_name} (${format.toLowerCase()})`, 'appearance', events, teamIds, [playerId]);
    }
  }
  return facts;
}
