'use client';

import {useMemo, useState} from 'react';
import {
  loadResultContests,
  loadResultProcessingStatus,
  loadResultRosterPlayers,
  loadResultStructuralPoints,
  loadResultsRound,
  loadResultsWorkspace,
  saveOfficeResult,
  type ResultProcessingStatus,
  type ResultRosterPlayer,
  type ResultStructuralCategory,
  type ResultStructuralPointInput,
} from '@/app/office/results/actions';
import type {Course} from '@/domain/course/Course';
import type {
  MatchResult,
  ResultContest,
  ResultContestFormat,
  ResultContestInput,
  ResultContestOutcome,
  ResultContestSide,
  ResultsFieldErrors,
} from '@/domain/results/MatchResult';
import type {LaunchPlayer} from '@/domain/launch/LaunchData';
import type {Match} from '@/domain/schedule/Match';
import type {Round} from '@/domain/schedule/Round';
import type {Schedule} from '@/domain/schedule/Schedule';
import type {Team} from '@/models/Team';
import styles from './ResultsManagement.module.css';

type DraftAdjustment = Omit<ResultStructuralPointInput, 'category'> & {
  category: ResultStructuralCategory | '';
};

type EditorState = {
  match: Match;
  result?: MatchResult;
};

type ResultsManagementProps = {
  initialSchedules: Schedule[];
  initialRounds: Round[];
  initialMatches: Match[];
  initialResults: MatchResult[];
  initialTeams: Team[];
  initialCourses: Course[];
  initialRoundId: string;
  initialPlayers: LaunchPlayer[];
};

export function ResultsManagement({
  initialSchedules,
  initialRounds,
  initialMatches,
  initialResults,
  initialTeams,
  initialCourses,
  initialRoundId,
  initialPlayers,
}: ResultsManagementProps) {
  const [schedules, setSchedules] = useState(initialSchedules);
  const [rounds, setRounds] = useState(initialRounds);
  const [matches, setMatches] = useState(initialMatches);
  const [results, setResults] = useState(initialResults);
  const [teams, setTeams] = useState(initialTeams);
  const [courses, setCourses] = useState(initialCourses);
  const [roundId, setRoundId] = useState(initialRoundId);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [homeScore, setHomeScore] = useState('');
  const [awayScore, setAwayScore] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ResultsFieldErrors>({});
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [contests, setContests] = useState<ResultContestInput[]>([]);
  const [officialRosterPlayers, setOfficialRosterPlayers] = useState<ResultRosterPlayer[]>([]);
  const [adjustmentRows, setAdjustmentRows] = useState<DraftAdjustment[]>([]);
  const [processingStatus, setProcessingStatus] = useState<ResultProcessingStatus | null>(null);

  async function load(preferredRoundId?: string) {
    const workspace = await loadResultsWorkspace(preferredRoundId || roundId);
    if (!workspace.ok) {
      setMessage(workspace.message);
      return;
    }
    setSchedules(workspace.data.schedules);
    setTeams(workspace.data.teams);
    setCourses(workspace.data.courses);
    setResults(workspace.data.results);
    setRounds(workspace.data.rounds);
    setRoundId(workspace.data.roundId);
    setMatches(workspace.data.matches);
  }

  async function selectRound(nextRoundId: string) {
    setRoundId(nextRoundId);
    const round = await loadResultsRound(nextRoundId);
    if (!round.ok) {
      setMessage(round.message);
      setMatches([]);
      return;
    }
    setMatches(round.data);
    setEditor(null);
    setMessage('');
  }

  async function openEditor(match: Match) {
    const result = results.find((candidate) => candidate.matchId === match.id);
    setEditor({match, result});
    setHomeScore(result?.homeScore === null || result?.homeScore === undefined ? '' : String(result.homeScore));
    setAwayScore(result?.awayScore === null || result?.awayScore === undefined ? '' : String(result.awayScore));
    setFieldErrors({});
    setMessage('');
    const [contestResult, rosterResult, structuralResult, processingResult] = await Promise.all([
      loadResultContests(match.id),
      loadResultRosterPlayers(match.id),
      loadResultStructuralPoints(match.id),
      loadResultProcessingStatus(match.id),
    ]);
    if (!contestResult.ok) {
      setContests([]);
      setOfficialRosterPlayers([]);
      setProcessingStatus(null);
      setMessage(contestResult.message);
      return;
    }
    setContests(contestResult.data.map(toContestInput));
    if (rosterResult.ok) {
      setOfficialRosterPlayers(rosterResult.data);
    } else {
      setOfficialRosterPlayers([]);
      setMessage(rosterResult.message);
    }
    if (structuralResult.ok) {
      setAdjustmentRows(structuralResult.data);
    } else {
      setAdjustmentRows([]);
      setMessage(structuralResult.message);
    }
    setProcessingStatus(processingResult.ok ? processingResult.data : null);
  }

  async function save(action: 'draft' | 'publish' | 'reopen') {
    if (!editor) return;
    setSaving(true);
    setFieldErrors({});

    const parsedHomeScore = parseScore(homeScore);
    const parsedAwayScore = parseScore(awayScore);
    const audit = resultAudit(contests, parsedHomeScore, parsedAwayScore);

    if (action === 'publish' && (audit.homeResidual < 0 || audit.awayResidual < 0)) {
      setSaving(false);
      setMessage('Official scores cannot be less than played contest points.');
      return;
    }
    if (!adjustmentAudit.entriesValid || (action === 'publish' && !adjustmentAudit.valid)) {
      setSaving(false);
      setMessage(adjustmentAudit.message);
      return;
    }

    const structuralPoints: ResultStructuralPointInput[] = adjustmentRows.map((point) => ({
      awardedTeamId: point.awardedTeamId,
      category: point.category as ResultStructuralCategory,
      points: point.points,
      note: point.note,
    }));

    const input = {
      homeScore: parsedHomeScore,
      awayScore: parsedAwayScore,
      contests,
    };
    const result = await saveOfficeResult(
      action,
      editor.match.id,
      editor.match.seasonId,
      input,
      structuralPoints,
    );
    setSaving(false);
    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {});
      setMessage(result.message);
      return;
    }
    setMessage(
      action === 'draft'
        ? 'Draft saved.'
        : action === 'publish'
          ? 'Match finalized. Clash Index, stats, standings, and Clash Pulse data are ready.'
          : 'Result reopened.',
    );
    await load(roundId);
    setEditor({match: editor.match, result: result.data});
    if (action === 'publish') {
      const status = await loadResultProcessingStatus(editor.match.id);
      setProcessingStatus(status.ok ? status.data : null);
    }
  }

  const audit = useMemo(
    () => resultAudit(contests, parseScore(homeScore), parseScore(awayScore)),
    [contests, homeScore, awayScore],
  );

  const adjustmentAudit = useMemo(() => {
    const assigned = (teamId: string | null) => adjustmentRows
      .filter((row) => row.awardedTeamId === teamId)
      .reduce((sum, row) => sum + row.points, 0);
    const duplicates = new Set<string>();
    let valid = true;
    for (const row of adjustmentRows) {
      const key = `${row.awardedTeamId}:${row.category}`;
      if (!row.category || duplicates.has(key) || !Number.isFinite(row.points)
        || row.points <= 0 || !Number.isInteger(row.points * 2)
        || ![editor?.match.homeTeamId, editor?.match.awayTeamId].includes(row.awardedTeamId)) valid = false;
      duplicates.add(key);
    }
    const home = assigned(editor?.match.homeTeamId ?? null);
    const away = assigned(editor?.match.awayTeamId ?? null);
    const reconciled = Math.abs(home - audit.homeResidual) < .001
      && Math.abs(away - audit.awayResidual) < .001;
    return {
      entriesValid: valid,
      valid: valid && reconciled,
      home,
      away,
      message: !valid
        ? 'Each adjustment needs a unique reason per team and a positive amount in 0.5-point steps. Combine no-show penalties into one item.'
        : 'Itemized scoring adjustments must add up exactly to the difference between played contests and the official score.',
    };
  }, [adjustmentRows, audit, editor]);

  const teamNames = useMemo(() => new Map(teams.map((team) => [team.id, team.name])), [teams]);
  const courseNames = useMemo(() => new Map(courses.map((course) => [course.id, course.name])), [courses]);
  const scheduleNames = useMemo(() => new Map(schedules.map((schedule) => [schedule.id, schedule.name])), [schedules]);
  const playersByTeam = useMemo(() => {
    const grouped = new Map<string, LaunchPlayer[]>();
    for (const player of initialPlayers.filter((candidate) => candidate.active && candidate.currentTeamId)) {
      const rows = grouped.get(player.currentTeamId!) ?? [];
      rows.push(player);
      grouped.set(player.currentTeamId!, rows);
    }
    return grouped;
  }, [initialPlayers]);

  const officialPlayersByTeam = useMemo(() => {
    const grouped = new Map<string, ResultRosterPlayer[]>();
    for (const player of officialRosterPlayers) {
      const rows = grouped.get(player.teamId) ?? [];
      rows.push(player);
      grouped.set(player.teamId, rows);
    }
    return grouped;
  }, [officialRosterPlayers]);

  function resultPlayersForTeam(teamId: string | null): Array<{id: string; name: string}> {
    if (!teamId) return [];
    const official = officialPlayersByTeam.get(teamId);
    return official?.length ? official : playersByTeam.get(teamId) ?? [];
  }

  function addContest(format: ResultContestFormat) {
    if (!editor?.match.homeTeamId || !editor.match.awayTeamId) return;
    const position = Math.max(0, ...contests.filter((contest) => contest.format === format).map((contest) => contest.position)) + 1;
    const playerSlots = format === 'Singles' ? [1] as const : [1, 2] as const;
    setContests([...contests, {
      id: `${editor.match.id}-${format.toLowerCase()}-${position}`,
      format,
      position,
      homeOutcome: 'T',
      awayOutcome: 'T',
      homeScore: null,
      awayScore: null,
      players: (['Home', 'Away'] as const).flatMap((side) => playerSlots.map((slot) => ({
        playerId: '',
        teamId: side === 'Home' ? editor.match.homeTeamId! : editor.match.awayTeamId!,
        side,
        slot,
      }))),
    }]);
  }

  function updateContest(index: number, update: Partial<ResultContestInput>) {
    setContests(contests.map((contest, contestIndex) => contestIndex === index ? {...contest, ...update} : contest));
  }

  function updateOutcome(index: number, homeOutcome: ResultContestOutcome) {
    updateContest(index, {
      homeOutcome,
      awayOutcome: homeOutcome === 'W' ? 'L' : homeOutcome === 'L' ? 'W' : 'T',
      homeScore: null,
      awayScore: null,
    });
  }

  function updatePlayer(index: number, side: ResultContestSide, slot: 1 | 2, playerId: string) {
    updateContest(index, {
      players: contests[index].players.map((player) =>
        player.side === side && player.slot === slot ? {...player, playerId} : player),
    });
  }

  return (
    <div className={styles.workspace}>
      <div className={styles.toolbar}>
        <label>
          <span>Round</span>
          <select value={roundId} onChange={(event) => void selectRound(event.target.value)}>
            {rounds.map((round) => (
              <option value={round.id} key={round.id}>
                {round.date} · {scheduleNames.get(round.scheduleId)} · Round {round.number}
              </option>
            ))}
          </select>
        </label>
      </div>

      <section className={styles.list}>
        <header>
          <div><span>Today&apos;s matches</span><h2>Record official outcomes</h2></div>
          <strong>{matches.length} matches</strong>
        </header>
        {matches.length ? matches.map((match) => {
          const result = results.find((candidate) => candidate.matchId === match.id);
          const status = result?.status === 'Published' ? 'Final' : result ? 'In Progress' : 'Scheduled';
          return (
            <button className={styles.matchRow} type="button" key={match.id} onClick={() => void openEditor(match)}>
              <span><small>{formatTime(match.time)}</small><b>{match.courseId ? courseNames.get(match.courseId) ?? match.courseId : 'Course TBD'}</b></span>
              <strong>{match.homeTeamId ? teamNames.get(match.homeTeamId) ?? match.homeTeamId : 'TBD'} <em>vs</em> {match.awayTeamId ? teamNames.get(match.awayTeamId) ?? match.awayTeamId : 'TBD'}</strong>
              <span className={`${styles.status} ${styles[status.replace(' ', '').toLowerCase()]}`}>{status}</span>
            </button>
          );
        }) : <p className={styles.empty}>No scheduled matches are available for this round.</p>}
      </section>

      {editor ? (
        <section className={styles.editor}>
          <header>
            <div><span>Result entry</span><h2>{editor.match.homeTeamId ? teamNames.get(editor.match.homeTeamId) : 'TBD'} vs {editor.match.awayTeamId ? teamNames.get(editor.match.awayTeamId) : 'TBD'}</h2></div>
            <button type="button" onClick={() => setEditor(null)}>Close</button>
          </header>
          <div className={styles.scores}>
            <label>
              <span>{editor.match.homeTeamId ? teamNames.get(editor.match.homeTeamId) : 'TBD'} score</span>
              <input type="number" min="0" step="0.5" value={homeScore} disabled={editor.result?.status === 'Published'} onChange={(event) => setHomeScore(event.target.value)} />
              {fieldErrors.homeScore ? <small>{fieldErrors.homeScore}</small> : null}
            </label>
            <b>–</b>
            <label>
              <span>{editor.match.awayTeamId ? teamNames.get(editor.match.awayTeamId) : 'TBD'} score</span>
              <input type="number" min="0" step="0.5" value={awayScore} disabled={editor.result?.status === 'Published'} onChange={(event) => setAwayScore(event.target.value)} />
              {fieldErrors.awayScore ? <small>{fieldErrors.awayScore}</small> : null}
            </label>
          </div>
          <section className={styles.contests}>
            <header>
              <div><span>Player results</span><h3>Singles and doubles</h3></div>
              {editor.result?.status !== 'Published' ? <div className={styles.contestButtons}>
                <button type="button" onClick={() => addContest('Singles')}>Add singles</button>
                <button type="button" onClick={() => addContest('Doubles')}>Add doubles</button>
              </div> : null}
            </header>
            {contests.length ? contests.map((contest, contestIndex) => (
              <article className={styles.contest} key={contest.id}>
                <div className={styles.contestHeading}>
                  <strong>{contest.format} {contest.position}</strong>
                  {editor.result?.status !== 'Published' ? <button type="button" onClick={() => setContests(contests.filter((_, index) => index !== contestIndex))}>Remove</button> : null}
                </div>
                <div className={styles.playerSides}>
                  {(['Home', 'Away'] as const).map((side) => {
                    const teamId = side === 'Home' ? editor.match.homeTeamId : editor.match.awayTeamId;
                    const slots = contest.format === 'Singles' ? [1] as const : [1, 2] as const;
                    return <div key={side}>
                      <b>{side} · {teamId ? teamNames.get(teamId) : 'TBD'}</b>
                      {slots.map((slot) => <label key={slot}>
                        <span>{contest.format === 'Doubles' ? `Player ${slot}` : 'Player'}</span>
                        <select
                          disabled={editor.result?.status === 'Published'}
                          value={contest.players.find((player) => player.side === side && player.slot === slot)?.playerId ?? ''}
                          onChange={(event) => updatePlayer(contestIndex, side, slot, event.target.value)}
                        >
                          <option value="">Select player</option>
                          {resultPlayersForTeam(teamId).map((player) => <option value={player.id} key={player.id}>{player.name}</option>)}
                        </select>
                      </label>)}
                    </div>;
                  })}
                </div>
                <label className={styles.outcome}>
                  <span>Home outcome</span>
                  <select disabled={editor.result?.status === 'Published'} value={contest.homeOutcome} onChange={(event) => updateOutcome(contestIndex, event.target.value as ResultContestOutcome)}>
                    <option value="W">Win</option><option value="L">Loss</option><option value="T">Tie</option>
                  </select>
                </label>
              </article>
            )) : <p className={styles.emptyContest}>No player contests entered yet. Team-only results remain supported.</p>}
            {fieldErrors.contests ? <p className={styles.contestError}>{fieldErrors.contests}</p> : null}
          </section>
          <div className={styles.review}>
            <strong>Finalize audit</strong>
            <div style={{display: 'grid', gap: 4, marginTop: 6}}>
              <span>Recorded matchups: {formatPoints(audit.homeContestPoints)}–{formatPoints(audit.awayContestPoints)}</span>
              {audit.automaticHomePoints || audit.automaticAwayPoints ? (
                <span>
                  Unfilled player positions (review only): {editor.match.homeTeamId ? teamNames.get(editor.match.homeTeamId) : 'Home'} +{formatPoints(audit.automaticHomePoints)}
                  {' · '}
                  {editor.match.awayTeamId ? teamNames.get(editor.match.awayTeamId) : 'Away'} +{formatPoints(audit.automaticAwayPoints)}
                </span>
              ) : null}
              {([
                {teamId: editor.match.homeTeamId, side: 'Home', residual: audit.homeResidual, allocated: adjustmentAudit.home},
                {teamId: editor.match.awayTeamId, side: 'Away', residual: audit.awayResidual, allocated: adjustmentAudit.away},
              ] as const).map(({teamId, side, residual, allocated}) => teamId ? (
                <div key={teamId} style={{display:'grid',gap:8, padding:'10px 0'}}>
                  <strong>{teamNames.get(teamId) ?? side} adjustments: {formatPoints(allocated)} / {formatPoints(residual)} required</strong>
                  {adjustmentRows.map((row, index) => row.awardedTeamId === teamId ? (
                    <div key={index} style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 84px auto',gap:8}}>
                      <select
                        aria-label={`${side} adjustment reason`}
                        disabled={editor.result?.status === 'Published'}
                        value={row.category}
                        onChange={(event) => setAdjustmentRows((current) => current.map((value, i) =>
                          i === index ? {...value, category: event.target.value as ResultStructuralCategory | ''} : value))}
                      >
                        <option value="">Choose reason</option>
                        <option value="UnplayedSlot">Unplayed singles slot</option>
                        <option value="NoShow">No-show penalties</option>
                        <option value="WomenBonus">Women bonus</option>
                        <option value="Penalty">Other penalty</option>
                        <option value="Other">Other points</option>
                      </select>
                      <input
                        aria-label={`${side} adjustment points`}
                        type="number" min="0.5" step="0.5"
                        disabled={editor.result?.status === 'Published'}
                        value={row.points || ''}
                        onChange={(event) => setAdjustmentRows((current) => current.map((value, i) =>
                          i === index ? {...value, points: Number(event.target.value)} : value))}
                      />
                      {editor.result?.status !== 'Published' ? (
                        <button type="button" onClick={() => setAdjustmentRows((current) => current.filter((_, i) => i !== index))}>Remove</button>
                      ) : null}
                      <input
                        style={{gridColumn:'1 / -1'}}
                        aria-label={`${side} adjustment note`}
                        placeholder="Explanation (e.g. rostered no-shows + match assignment)"
                        disabled={editor.result?.status === 'Published'}
                        value={row.note ?? ''}
                        onChange={(event) => setAdjustmentRows((current) => current.map((value, i) =>
                          i === index ? {...value, note: event.target.value} : value))}
                      />
                    </div>
                  ) : null)}
                  {editor.result?.status !== 'Published' ? (
                    <button type="button" className={styles.secondary} onClick={() => setAdjustmentRows((current) => [
                      ...current,
                      {awardedTeamId: teamId, category:'', points:Math.max(.5, residual - allocated), note:''},
                    ])}>Add adjustment</button>
                  ) : null}
                </div>
              ) : null)}
              {!adjustmentAudit.valid ? <span role="status">{adjustmentAudit.message}</span> : null}
              {audit.homeResidual < 0 || audit.awayResidual < 0 ? (
                <span>Score audit mismatch — the official score is below the entered matchup points.</span>
              ) : null}
              {editor.result?.status === 'Published' && processingStatus?.ciProcessed ? (
                <span>CI processed · {processingStatus.factCount} rating facts · {processingStatus.playerUpdateCount} players updated · Clash Pulse ready</span>
              ) : editor.result?.status === 'Published' ? (
                <span>Published result · CI processing has not been completed for this match.</span>
              ) : null}
            </div>
            <p style={{marginBottom: 0}}>
              {editor.result?.status === 'Published'
                ? processingStatus?.ciProcessed
                  ? 'This result is final and CI-locked. Corrections require the CI replay workflow.'
                  : 'This result is final. It can still be reopened because CI has not been published.'
                : 'Finalizing publishes the scoreboard, updates CI, refreshes stats/standings, and makes verified Clash Pulse facts available.'}
            </p>
          </div>
          {message ? <p className={styles.message} role="status">{message}</p> : null}
          <div className={styles.actions}>
            {editor.result?.status === 'Published' ? (
              <button type="button" className={styles.secondary} disabled={saving} onClick={() => void save('reopen')}>Reopen result</button>
            ) : (
              <>
                <button type="button" className={styles.secondary} disabled={saving} onClick={() => void save('draft')}>Save draft</button>
                <button
                  type="button"
                  className={styles.primary}
                  disabled={saving || audit.homeResidual < 0 || audit.awayResidual < 0 || !adjustmentAudit.valid}
                  onClick={() => void save('publish')}
                >
                  Finalize match
                </button>
              </>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function toContestInput(contest: ResultContest): ResultContestInput {
  return {
    id: contest.id,
    format: contest.format,
    position: contest.position,
    homeOutcome: contest.homeOutcome,
    awayOutcome: contest.awayOutcome,
    homeScore: null,
    awayScore: null,
    players: contest.players.map(({playerId, teamId, side, slot}) => ({playerId, teamId, side, slot})),
  };
}


function resultAudit(
  contests: ResultContestInput[],
  homeScore: number | null,
  awayScore: number | null,
) {
  let homeContestPoints = 0;
  let awayContestPoints = 0;
  let automaticHomePoints = 0;
  let automaticAwayPoints = 0;

  for (const contest of contests) {
    const maximumPoints = contest.format === 'Singles' ? 1 : 2;
    const expectedPlayersPerSide = contest.format === 'Singles' ? 1 : 2;
    if (contest.homeOutcome === 'W') {
      homeContestPoints += maximumPoints;
    } else if (contest.homeOutcome === 'L') {
      awayContestPoints += maximumPoints;
    } else {
      homeContestPoints += maximumPoints / 2;
      awayContestPoints += maximumPoints / 2;
    }

    const homePlayers = contest.players.filter((player) => player.side === 'Home' && player.playerId.trim()).length;
    const awayPlayers = contest.players.filter((player) => player.side === 'Away' && player.playerId.trim()).length;
    automaticHomePoints += Math.max(0, expectedPlayersPerSide - awayPlayers);
    automaticAwayPoints += Math.max(0, expectedPlayersPerSide - homePlayers);
  }

  return {
    homeContestPoints,
    awayContestPoints,
    automaticHomePoints,
    automaticAwayPoints,
    homeResidual: homeScore == null ? 0 : homeScore - homeContestPoints,
    awayResidual: awayScore == null ? 0 : awayScore - awayContestPoints,
  };
}

function formatPoints(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function parseScore(value: string): number | null {
  if (!value.trim()) return null;
  return Number(value);
}

function formatTime(value: string | null): string {
  if (!value) return 'Time TBD';
  const [hours, minutes] = value.split(':').map(Number);
  return new Intl.DateTimeFormat('en-US', {hour: 'numeric', minute: '2-digit'})
    .format(new Date(2000, 0, 1, hours, minutes));
}
