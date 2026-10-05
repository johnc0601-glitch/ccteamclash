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
import {
  calculateMatchPointsAvailability,
  pointsPercentage,
  type MatchPlayerGender,
  type MatchPointsAvailability,
} from '@/services/results/MatchPointsAvailability';
import styles from './ResultsManagement.module.css';

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
  const [homeAdjustment, setHomeAdjustment] = useState<{category: ResultStructuralCategory | ''; note: string}>({category: '', note: ''});
  const [awayAdjustment, setAwayAdjustment] = useState<{category: ResultStructuralCategory | ''; note: string}>({category: '', note: ''});
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
      const homePoint = structuralResult.data.find((point) =>
        point.awardedTeamId === match.homeTeamId && point.category !== 'WomenBonus');
      const awayPoint = structuralResult.data.find((point) =>
        point.awardedTeamId === match.awayTeamId && point.category !== 'WomenBonus');
      setHomeAdjustment({
        category: homePoint?.category ?? '',
        note: homePoint?.note ?? '',
      });
      setAwayAdjustment({
        category: awayPoint?.category ?? '',
        note: awayPoint?.note ?? '',
      });
    } else {
      setHomeAdjustment({category: '', note: ''});
      setAwayAdjustment({category: '', note: ''});
    }
    setProcessingStatus(processingResult.ok ? processingResult.data : null);
  }

  async function save(action: 'draft' | 'publish' | 'reopen') {
    if (!editor) return;
    setSaving(true);
    setFieldErrors({});

    const parsedHomeScore = parseScore(homeScore);
    const parsedAwayScore = parseScore(awayScore);
    const audit = resultAudit(contests, parsedHomeScore, parsedAwayScore, playerGenders);

    if (action === 'publish') {
      if (audit.homeResidual < 0 || audit.awayResidual < 0) {
        setSaving(false);
        setMessage('The official score is lower than the entered matchup points. Review the result rows before finalizing.');
        return;
      }
      if ((audit.homeResidual > 0 && !homeAdjustment.category) || (audit.awayResidual > 0 && !awayAdjustment.category)) {
        setSaving(false);
        setMessage('Choose a reason for every additional scoring adjustment before finalizing.');
        return;
      }
    }

    const structuralPoints: ResultStructuralPointInput[] = [];
    if (editor.match.homeTeamId && audit.homeResidual > 0 && homeAdjustment.category) {
      structuralPoints.push({
        awardedTeamId: editor.match.homeTeamId,
        category: homeAdjustment.category,
        points: audit.homeResidual,
        note: homeAdjustment.note,
      });
    }
    if (editor.match.awayTeamId && audit.awayResidual > 0 && awayAdjustment.category) {
      structuralPoints.push({
        awardedTeamId: editor.match.awayTeamId,
        category: awayAdjustment.category,
        points: audit.awayResidual,
        note: awayAdjustment.note,
      });
    }

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

  const playerGenders = useMemo(
    () => new Map(initialPlayers.map((player) => [player.id, player.gender] as const)),
    [initialPlayers],
  );

  const audit = useMemo(
    () => resultAudit(contests, parseScore(homeScore), parseScore(awayScore), playerGenders),
    [contests, homeScore, awayScore, playerGenders],
  );

  const displayAvailability = useMemo(
    () => publishedAvailability(editor?.result) ?? audit.availability,
    [editor?.result, audit.availability],
  );

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
              <span>
                Points available: {editor.match.homeTeamId ? teamNames.get(editor.match.homeTeamId) : 'Home'} {formatPoints(displayAvailability.homePointsAvailable)}
                {' · '}
                {editor.match.awayTeamId ? teamNames.get(editor.match.awayTeamId) : 'Away'} {formatPoints(displayAvailability.awayPointsAvailable)}
              </span>
              {displayAvailability.homeGenderBonusAvailable || displayAvailability.awayGenderBonusAvailable ? (
                <span>
                  Automatic gender bonus: {editor.match.homeTeamId ? teamNames.get(editor.match.homeTeamId) : 'Home'} +{formatPoints(displayAvailability.homeGenderBonusAvailable)}
                  {' · '}
                  {editor.match.awayTeamId ? teamNames.get(editor.match.awayTeamId) : 'Away'} +{formatPoints(displayAvailability.awayGenderBonusAvailable)}
                </span>
              ) : null}
              {parseScore(homeScore) !== null && parseScore(awayScore) !== null ? (
                <span>
                  Points %: {editor.match.homeTeamId ? teamNames.get(editor.match.homeTeamId) : 'Home'} {formatPercentage(pointsPercentage(parseScore(homeScore)!, displayAvailability.homePointsAvailable))}
                  {' · '}
                  {editor.match.awayTeamId ? teamNames.get(editor.match.awayTeamId) : 'Away'} {formatPercentage(pointsPercentage(parseScore(awayScore)!, displayAvailability.awayPointsAvailable))}
                </span>
              ) : null}
              {audit.automaticHomePoints || audit.automaticAwayPoints ? (
                <span>
                  Automatic matchup slots: {editor.match.homeTeamId ? teamNames.get(editor.match.homeTeamId) : 'Home'} +{formatPoints(audit.automaticHomePoints)}
                  {' · '}
                  {editor.match.awayTeamId ? teamNames.get(editor.match.awayTeamId) : 'Away'} +{formatPoints(audit.automaticAwayPoints)}
                </span>
              ) : null}
              {audit.homeResidual > 0 ? (
                <label>
                  <span>{editor.match.homeTeamId ? teamNames.get(editor.match.homeTeamId) : 'Home'} additional +{formatPoints(audit.homeResidual)}</span>
                  <select
                    disabled={editor.result?.status === 'Published'}
                    value={homeAdjustment.category}
                    onChange={(event) => setHomeAdjustment((current) => ({...current, category: event.target.value as ResultStructuralCategory | ''}))}
                  >
                    <option value="">Choose reason</option>
                    <option value="NoShow">No-show</option>
                    <option value="Penalty">Penalty</option>
                    <option value="Other">Other</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Optional note"
                    disabled={editor.result?.status === 'Published'}
                    value={homeAdjustment.note}
                    onChange={(event) => setHomeAdjustment((current) => ({...current, note: event.target.value}))}
                  />
                </label>
              ) : null}
              {audit.awayResidual > 0 ? (
                <label>
                  <span>{editor.match.awayTeamId ? teamNames.get(editor.match.awayTeamId) : 'Away'} additional +{formatPoints(audit.awayResidual)}</span>
                  <select
                    disabled={editor.result?.status === 'Published'}
                    value={awayAdjustment.category}
                    onChange={(event) => setAwayAdjustment((current) => ({...current, category: event.target.value as ResultStructuralCategory | ''}))}
                  >
                    <option value="">Choose reason</option>
                    <option value="NoShow">No-show</option>
                    <option value="Penalty">Penalty</option>
                    <option value="Other">Other</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Optional note"
                    disabled={editor.result?.status === 'Published'}
                    value={awayAdjustment.note}
                    onChange={(event) => setAwayAdjustment((current) => ({...current, note: event.target.value}))}
                  />
                </label>
              ) : null}
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
                  disabled={saving || audit.homeResidual < 0 || audit.awayResidual < 0 || (audit.homeResidual > 0 && !homeAdjustment.category) || (audit.awayResidual > 0 && !awayAdjustment.category)}
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
  playerGenders: ReadonlyMap<string, MatchPlayerGender>,
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

  const availability = calculateMatchPointsAvailability(contests, playerGenders);

  return {
    homeContestPoints,
    awayContestPoints,
    automaticHomePoints,
    automaticAwayPoints,
    availability,
    homeResidual: homeScore == null
      ? 0
      : homeScore - homeContestPoints - availability.homeGenderBonusAvailable,
    awayResidual: awayScore == null
      ? 0
      : awayScore - awayContestPoints - availability.awayGenderBonusAvailable,
  };
}

function publishedAvailability(result: MatchResult | undefined): MatchPointsAvailability | undefined {
  if (result?.status !== 'Published'
    || result.homeBasePointsAvailable == null
    || result.awayBasePointsAvailable == null
    || result.homeGenderBonusAvailable == null
    || result.awayGenderBonusAvailable == null
    || result.homePointsAvailable == null
    || result.awayPointsAvailable == null) return undefined;

  return {
    homeBasePointsAvailable: result.homeBasePointsAvailable,
    awayBasePointsAvailable: result.awayBasePointsAvailable,
    homeGenderBonusAvailable: result.homeGenderBonusAvailable,
    awayGenderBonusAvailable: result.awayGenderBonusAvailable,
    homePointsAvailable: result.homePointsAvailable,
    awayPointsAvailable: result.awayPointsAvailable,
  };
}

function formatPercentage(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
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
