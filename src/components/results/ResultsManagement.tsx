'use client';

import {useMemo, useState} from 'react';
import {services} from '@/core/ServiceContainer';
import {ClashRatingFinalization} from '@/components/results/ClashRatingFinalization';
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

  async function load(preferredRoundId?: string) {
    const [nextSchedules, nextTeams, nextCourses, nextResults] = await Promise.all([
      services.schedules.getSchedules(),
      services.schedules.getTeams(),
      services.schedules.getCourses(),
      services.results.getResults(),
    ]);
    const nextRounds = (await Promise.all(
      nextSchedules.map((schedule) => services.schedules.getRounds(schedule.id)),
    )).flat().sort((left, right) =>
      (left.date ?? '').localeCompare(right.date ?? '') || left.number - right.number,
    );
    const selectedRoundId = preferredRoundId || roundId || nextRounds[0]?.id || '';
    const nextMatches = selectedRoundId
      ? await services.schedules.getMatches(selectedRoundId)
      : [];
    setSchedules(nextSchedules);
    setTeams(nextTeams);
    setCourses(nextCourses);
    setResults(nextResults);
    setRounds(nextRounds);
    setRoundId(selectedRoundId);
    setMatches(nextMatches);
  }

  async function selectRound(nextRoundId: string) {
    setRoundId(nextRoundId);
    setMatches(await services.schedules.getMatches(nextRoundId));
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
    setContests((await services.results.getContests(match.id)).map(toContestInput));
  }

  async function save(action: 'draft' | 'publish' | 'reopen') {
    if (!editor) return;
    setSaving(true);
    setFieldErrors({});
    const input = {
      homeScore: parseScore(homeScore),
      awayScore: parseScore(awayScore),
      contests,
    };
    const result = action === 'draft'
      ? await services.results.saveDraft(editor.match.id, input)
      : action === 'publish'
        ? await services.results.publish(editor.match.id, input)
        : await services.results.reopen(editor.match.id);
    setSaving(false);
    if (!result.ok) {
      setFieldErrors(result.fieldErrors ?? {});
      setMessage(result.message);
      return;
    }
    setMessage(action === 'draft' ? 'Draft saved.' : action === 'publish' ? 'Result published.' : 'Result reopened.');
    if (action !== 'draft') await services.playoffs.getBracket(editor.match.seasonId);
    await load(roundId);
    setEditor({match: editor.match, result: result.data});
  }

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
    });
  }

  function updateSinglesScore(index: number, side: ResultContestSide, value: string) {
    const contest = contests[index];
    const score = parseScore(value);
    const homeScore = side === 'Home' ? score : contest.homeScore;
    const awayScore = side === 'Away' ? score : contest.awayScore;
    const update: Partial<ResultContestInput> = {homeScore, awayScore};
    if (homeScore !== null && awayScore !== null) {
      update.homeOutcome = homeScore > awayScore ? 'W' : homeScore < awayScore ? 'L' : 'T';
      update.awayOutcome = update.homeOutcome === 'W' ? 'L' : update.homeOutcome === 'L' ? 'W' : 'T';
    }
    updateContest(index, update);
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

      <ClashRatingFinalization
        rounds={rounds}
        matches={matches}
        results={results}
        selectedRoundId={roundId}
      />

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
              <input type="number" min="0" step="1" value={homeScore} disabled={editor.result?.status === 'Published'} onChange={(event) => setHomeScore(event.target.value)} />
              {fieldErrors.homeScore ? <small>{fieldErrors.homeScore}</small> : null}
            </label>
            <b>–</b>
            <label>
              <span>{editor.match.awayTeamId ? teamNames.get(editor.match.awayTeamId) : 'TBD'} score</span>
              <input type="number" min="0" step="1" value={awayScore} disabled={editor.result?.status === 'Published'} onChange={(event) => setAwayScore(event.target.value)} />
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
                          {(teamId ? playersByTeam.get(teamId) ?? [] : []).map((player) => <option value={player.id} key={player.id}>{player.name}</option>)}
                        </select>
                      </label>)}
                    </div>;
                  })}
                </div>
                {contest.format === 'Singles' ? <div className={styles.contestScores}>
                  <label><span>Home score</span><input disabled={editor.result?.status === 'Published'} type="number" min="0" step="1" value={contest.homeScore ?? ''} onChange={(event) => updateSinglesScore(contestIndex, 'Home', event.target.value)} /></label>
                  <label><span>Away score</span><input disabled={editor.result?.status === 'Published'} type="number" min="0" step="1" value={contest.awayScore ?? ''} onChange={(event) => updateSinglesScore(contestIndex, 'Away', event.target.value)} /></label>
                </div> : <label className={styles.outcome}>
                  <span>Home outcome</span>
                  <select disabled={editor.result?.status === 'Published'} value={contest.homeOutcome} onChange={(event) => updateOutcome(contestIndex, event.target.value as ResultContestOutcome)}>
                    <option value="W">Win</option><option value="L">Loss</option><option value="T">Tie</option>
                  </select>
                </label>}
              </article>
            )) : <p className={styles.emptyContest}>No player contests entered yet. Team-only results remain supported.</p>}
            {fieldErrors.contests ? <p className={styles.contestError}>{fieldErrors.contests}</p> : null}
          </section>
          <p className={styles.review}>
            {editor.result?.status === 'Published'
              ? 'This result is final and locked. Reopen it before making a correction.'
              : 'Review both team scores before publishing. Drafts are visible only in the Commissioner Office.'}
          </p>
          {message ? <p className={styles.message} role="status">{message}</p> : null}
          <div className={styles.actions}>
            {editor.result?.status === 'Published' ? (
              <button type="button" className={styles.secondary} disabled={saving} onClick={() => void save('reopen')}>Reopen result</button>
            ) : (
              <>
                <button type="button" className={styles.secondary} disabled={saving} onClick={() => void save('draft')}>Save draft</button>
                <button type="button" className={styles.primary} disabled={saving} onClick={() => void save('publish')}>Publish final result</button>
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
    homeScore: contest.homeScore,
    awayScore: contest.awayScore,
    players: contest.players.map(({playerId, teamId, side, slot}) => ({playerId, teamId, side, slot})),
  };
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
