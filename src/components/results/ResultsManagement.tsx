'use client';

import {useMemo, useState} from 'react';
import {services} from '@/core/ServiceContainer';
import type {Course} from '@/domain/course/Course';
import type {MatchResult, ResultsFieldErrors} from '@/domain/results/MatchResult';
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
};

export function ResultsManagement({
  initialSchedules,
  initialRounds,
  initialMatches,
  initialResults,
  initialTeams,
  initialCourses,
  initialRoundId,
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

  function openEditor(match: Match) {
    const result = results.find((candidate) => candidate.matchId === match.id);
    setEditor({match, result});
    setHomeScore(result?.homeScore === null || result?.homeScore === undefined ? '' : String(result.homeScore));
    setAwayScore(result?.awayScore === null || result?.awayScore === undefined ? '' : String(result.awayScore));
    setFieldErrors({});
    setMessage('');
  }

  async function save(action: 'draft' | 'publish' | 'reopen') {
    if (!editor) return;
    setSaving(true);
    setFieldErrors({});
    const input = {
      homeScore: parseScore(homeScore),
      awayScore: parseScore(awayScore),
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
            <button className={styles.matchRow} type="button" key={match.id} onClick={() => openEditor(match)}>
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
