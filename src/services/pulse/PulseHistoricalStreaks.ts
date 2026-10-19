import type {PulseFact, PulseMatch, PulseRating, PulseRound, PulseSource} from './PulseFacts';

export type ArchivedTeamMatch = {
  id: number; season_name: string; event_order: number; event_label: string;
  home_team_name: string; away_team_name: string;
  home_score: number | string | null; away_score: number | string | null;
};
export type ArchivedPlayerContest = {
  deduplication_key: string; season_id: string; event_order: number;
  historical_team_match_id: number; player_id: string; player_name: string;
  player_team_name: string; match_format: string; outcome: string;
  opponent_one_player_name: string | null; opponent_two_player_name: string | null;
};
export type ArchivedStreakSource = {teams: ArchivedTeamMatch[]; players: ArchivedPlayerContest[]};

type Outcome = 'W' | 'L' | 'T';
type Event = {
  id: string; seasonYear: number; order: number; sortKey: string;
  outcome: Outcome | null; current: boolean;
  opponent: string; sources: PulseFact['sources'];
};
type Subject = {key: string; name: string; unit: 'match' | 'appearance';
  format: 'Team' | 'Singles' | 'Doubles'; playerIds: string[]; teamIds: string[]; events: Event[]};
const modes = [
  {name: 'winning', accepts: (value: Outcome) => value === 'W'},
  {name: 'losing', accepts: (value: Outcome) => value === 'L'},
  {name: 'unbeaten', accepts: (value: Outcome) => value !== 'L'},
  {name: 'winless', accepts: (value: Outcome) => value !== 'W'},
] as const;

const clean = (name: string) => name.toLowerCase().replace(/[^a-z0-9]/g, '');
const year = (name: string) => Number(name.match(/20\d{2}/)?.[0] ?? 0);
const valid = (value: unknown): Outcome | null => value === 'W' || value === 'L' || value === 'T' ? value : null;
const score = (value: number | string | null): number | null =>
  value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
const outcomeOf = (a: number | null, b: number | null): Outcome | null =>
  a == null || b == null ? null : a > b ? 'W' : a < b ? 'L' : 'T';

/**
 * Runs ending or continuing in the selected round. Only completed, recorded
 * appearances count. Archived player results have their own W/L/T and can be
 * used when an archived team score is missing; those unknown team results
 * explicitly interrupt TEAM streaks. Ambiguous multiple same-format archived
 * appearances on one match become an unknown barrier, not a fabricated order.
 */
export function generateAcrossSeasonStreakFacts(
  source: PulseSource, round: PulseRound, verified: PulseRating[], archive: ArchivedStreakSource,
): PulseFact[] {
  const startYear = year(source.seasons.find(s => s.id === round.season_id)?.name ?? '') || Number(round.date?.slice(0, 4) ?? 0);
  const roundOrder = new Map(source.rounds.filter(r => r.season_id === round.season_id && r.number <= round.number)
    .map(r => [r.id, r.number]));
  const playedMatches = source.matches.filter(m => m.season_id === round.season_id && roundOrder.has(m.round_id));
  const currentIds = new Set(playedMatches.filter(m => m.round_id === round.id).map(m => m.id));
  const subjects = new Map<string, Subject>();
  function add(key: string, name: string, unit: Subject['unit'], format: Subject['format'],
    playerIds: string[], teamIds: string[], event: Event) {
    const found = subjects.get(key) ?? {key, name, unit, format, playerIds, teamIds, events: []};
    if (event.current || !found.name) found.name = name;
    if (event.current && teamIds.length) found.teamIds = teamIds;
    found.events.push(event);
    subjects.set(key, found);
  }

  const archiveTeams = archive.teams.filter(m => year(m.season_name) > 0 && year(m.season_name) < startYear);
  // Historical scores have holes: never turn a recorded, scoreless match into
  // either a win or a skipped match.
  for (const match of archiveTeams) {
    for (const home of [true, false]) {
      const name = home ? match.home_team_name : match.away_team_name;
      const own = score(home ? match.home_score : match.away_score);
      const other = score(home ? match.away_score : match.home_score);
      add(`team:${clean(name)}`, name, 'match', 'Team', [], [],
        {id: `historical:${match.id}`, seasonYear: year(match.season_name),
          order: match.event_order, sortKey: String(match.id), outcome: outcomeOf(own,other),
          current: false, opponent: home ? match.away_team_name : match.home_team_name,
          sources: [{table: 'historical_team_matches', ids: [String(match.id)]}]});
    }
  }

  const teamNames = new Map<string, string>();
  for (const match of playedMatches) {
    teamNames.set(match.home_team_id, match.home_name);
    teamNames.set(match.away_team_id, match.away_name);
    const result = source.results.find(r => r.match_id === match.id && r.status === 'Published');
    for (const home of [true, false]) {
      const id = home ? match.home_team_id : match.away_team_id;
      const name = home ? match.home_name : match.away_name;
      const own = score(home ? result?.home_score ?? null : result?.away_score ?? null);
      const other = score(home ? result?.away_score ?? null : result?.home_score ?? null);
      add(`team:${clean(name)}`, name, 'match', 'Team', [], [id],
        {id: `live:${match.id}`, seasonYear: startYear, order: roundOrder.get(match.round_id)!,
          sortKey: `${match.date ?? ''}:${match.id}`, outcome: outcomeOf(own,other),
          current: currentIds.has(match.id),
          opponent: home ? match.away_name : match.home_name,
          sources: [{table: 'launch_match_results', ids: [match.id]},
            {table: 'launch_schedule_matches', ids: [match.id]}]});
    }
  }

  const archivePlayerMatches = new Map<number, ArchivedTeamMatch>(archiveTeams.map(m => [m.id,m]));
  // Group by appearance to prevent two contests in one historical match being
  // silently ordered using arbitrary row IDs.
  const archivedAppearances = new Map<string, ArchivedPlayerContest[]>();
  for (const p of archive.players) {
    if (!archivePlayerMatches.has(p.historical_team_match_id) || !['Singles','Doubles'].includes(p.match_format)) continue;
    const key = `${p.player_id}:${p.match_format}:${p.historical_team_match_id}`;
    archivedAppearances.set(key,[...(archivedAppearances.get(key) ?? []),p]);
  }
  for (const group of archivedAppearances.values()) {
    const p = group[0];
    const match = archivePlayerMatches.get(p.historical_team_match_id)!;
    const name = p.player_name;
    const opponent = [p.opponent_one_player_name,p.opponent_two_player_name].filter(Boolean).join(' & ');
    add(`player:${p.player_id}:${p.match_format}`, name, 'appearance',
      p.match_format as 'Singles' | 'Doubles', [p.player_id], [],
      {id: `historical:${match.id}:${p.match_format}`, seasonYear: year(match.season_name),
        order: match.event_order, sortKey: String(match.id),
        outcome: group.length === 1 ? valid(p.outcome) : null, current: false,
        opponent: opponent || (p.player_team_name ? 'recorded opponent' : 'opponent'),
        sources: [{table: 'historical_player_matchups',
          ids: group.map(item => `${item.deduplication_key}:${item.player_id}`)},
          {table: 'historical_team_matches', ids: [String(match.id)]}]});
  }

  // A frozen-rating row without complete snapshot reconciliation is an
  // unknown event, not a played win. Rating rows and official snapshots are
  // checked by verifiedRoundRatings before reaching this function.
  const validByKey = new Map<string, PulseRating[]>();
  for (const p of verified) {
    const k = `${p.player_id}:${p.match_id}:${p.format}`;
    validByKey.set(k,[...(validByKey.get(k) ?? []),p]);
  }
  const ratedByKey = new Map<string, PulseRating[]>();
  for (const p of source.ratings.filter(p => playedMatches.some(m => m.id === p.match_id))) {
    const k = `${p.player_id}:${p.match_id}:${p.format}`;
    ratedByKey.set(k,[...(ratedByKey.get(k) ?? []),p]);
  }
  for (const [key, group] of ratedByKey) {
    const p = group[0];
    const match = playedMatches.find(m => m.id === p.match_id)!;
    const checked = validByKey.get(key) ?? [];
    const verifiedOutcome = checked.length === 1 && group.length === 1 ? valid(checked[0].outcome) : null;
    const opponents = verifiedOutcome ? verified.filter(other => other.match_id === match.id
      && other.contest_id === checked[0].contest_id && other.side !== checked[0].side)
      .map(other => other.player_name) : [];
    add(`player:${p.player_id}:${p.format}`, p.player_name, 'appearance',
      p.format, [p.player_id], [p.team_id],
      {id: `live:${match.id}:${p.format}`, seasonYear: startYear,
        order: roundOrder.get(match.round_id)!, sortKey: `${match.date ?? ''}:${match.id}`,
        outcome: verifiedOutcome, current: currentIds.has(match.id),
        opponent: opponents.join(' & ') || (p.side === 'Home' ? match.away_name : match.home_name),
        sources: [{table: 'clash_contest_rating_facts', ids: group.map(r=>`${r.contest_id}:${r.player_id}`)},
          {table: 'launch_match_final_snapshots', ids: [match.id]}]});
  }

  const facts: PulseFact[] = [];
  for (const subject of subjects.values()) {
    if (!subject.events.some(e => e.current)) continue;
    const events = subject.events.sort((a,b) => a.seasonYear - b.seasonYear || a.order - b.order
      || a.sortKey.localeCompare(b.sortKey));
    // Same-round appearances cannot safely be sequenced when the date/order
    // is ambiguous. This is not common, but do not silently fabricate order.
    for (let i=1;i<events.length;i++) {
      if (events[i].seasonYear === events[i-1].seasonYear && events[i].order === events[i-1].order) {
        if (subject.unit === 'appearance') {
          events[i].outcome = null;
          events[i-1].outcome = null;
        }
      }
    }
    for (const mode of modes) {
      let run: Event[] = [];
      let uncertainStart = true;
      for (const event of events) {
        if (!event.outcome) {run = []; uncertainStart = true; continue;}
        const continuing = mode.accepts(event.outcome);
        const priorLength = run.length;
        const count = priorLength + (continuing ? 1 : 0);
        const broken = !continuing;
        const meaningful = event.current && (continuing ? count >= 2 : priorLength >= 2);
        // Avoid repeating every uninterrupted winning streak as an identical
        // unbeaten streak (and losing streak as an identical winless streak).
        const duplicate = mode.name === 'unbeaten'
          ? run.every(e => e.outcome === 'W') && (broken || event.outcome === 'W')
          : mode.name === 'winless'
          ? run.every(e => e.outcome === 'L') && (broken || event.outcome === 'L')
          : false;
        if (meaningful && !duplicate) {
          const refs = [...run,event].flatMap(e=>e.sources);
          const sources = [...new Set(refs.map(r => r.table))].map(table => ({
            table, ids: [...new Set(refs.filter(r => r.table === table).flatMap(r=>r.ids))].sort(),
          }));
          const displayName = subject.format === 'Team' ? subject.name
            : `${subject.name} (${subject.format.toLowerCase()})`;
          const lengthText = `${uncertainStart ? 'at least ' : ''}${count}-${subject.unit}`;
          const eventResult = event.outcome === 'W' ? 'a win' : event.outcome === 'L' ? 'a loss' : 'a tie';
          const text = broken
            ? `${displayName}: ${lengthText} ${mode.name} streak ended with ${eventResult} against ${event.opponent} in Round ${round.number}.`
            : `${displayName}: ${lengthText} ${mode.name} streak through Round ${round.number}.`;
          facts.push({
            fact_key: `historical-streak:${subject.key}:${mode.name}:${event.id}`,
            category: broken ? 'Broken streaks' : 'Streaks',
            fact_text: text, match_id: event.id.startsWith('live:') ? event.id.slice(5).split(':')[0] : null,
            team_ids: subject.teamIds, player_ids: subject.playerIds,
            sources, calculation: `Across recorded league seasons through Round ${round.number}. Consecutive recorded ${subject.unit}s; player singles and doubles separately. Missing scores or uncertain player appearances interrupt the streak. A team match with a missing published score is unknown. Ties count for unbeaten/winless, but interrupt winning/losing streaks. At least two verified results. Historical coverage may be incomplete.`,
            metric: count, ranking: null,
          });
        }
        if (continuing) run.push(event);
        else {run = []; uncertainStart = false;}
      }
    }
  }
  // The most meaningful long runs first, with a stable result for equal runs.
  return facts.sort((a,b) => (b.metric ?? 0) - (a.metric ?? 0) || a.fact_key.localeCompare(b.fact_key));
}
