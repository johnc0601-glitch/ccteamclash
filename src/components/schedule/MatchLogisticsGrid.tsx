'use client';

import {useEffect, useMemo, useState} from 'react';
import type {Course} from '@/domain/course/Course';
import {MATCH_STATUSES, type Match, type MatchInput} from '@/domain/schedule/Match';
import type {Round} from '@/domain/schedule/Round';
import type {Team} from '@/models/Team';
import {getTeamName} from '@/components/schedule/scheduleDisplay';
import styles from './ScheduleManagement.module.css';

type Draft = Pick<MatchInput, 'courseId' | 'date' | 'time' | 'status' | 'notes'>;

type MatchLogisticsGridProps = {
  rounds: Round[];
  matches: Match[];
  teams: Team[];
  courses: Course[];
  editable: boolean;
  savingId: string | null;
  onSave: (match: Match, draft: Draft) => Promise<void>;
};

function toDraft(match: Match): Draft {
  return {
    courseId: match.courseId ?? '',
    date: match.date ?? '',
    time: match.time ?? '',
    status: match.status,
    notes: match.notes,
  };
}

export function MatchLogisticsGrid({
  rounds,
  matches,
  teams,
  courses,
  editable,
  savingId,
  onSave,
}: MatchLogisticsGridProps) {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});

  useEffect(() => {
    setDrafts(Object.fromEntries(matches.map((match) => [match.id, toDraft(match)])));
  }, [matches]);

  const roundById = useMemo(
    () => new Map(rounds.map((round) => [round.id, round])),
    [rounds],
  );

  const orderedMatches = useMemo(() => [...matches].sort((left, right) => {
    const leftRound = roundById.get(left.roundId)?.number ?? Number.MAX_SAFE_INTEGER;
    const rightRound = roundById.get(right.roundId)?.number ?? Number.MAX_SAFE_INTEGER;
    if (leftRound !== rightRound) return leftRound - rightRound;
    return (left.time ?? '').localeCompare(right.time ?? '')
      || getTeamName(left.awayTeamId, teams).localeCompare(getTeamName(right.awayTeamId, teams));
  }), [matches, roundById, teams]);

  function setDraftField<K extends keyof Draft>(matchId: string, field: K, value: Draft[K]) {
    setDrafts((current) => ({
      ...current,
      [matchId]: {...current[matchId], [field]: value},
    }));
  }

  function isDirty(match: Match, draft: Draft | undefined) {
    if (!draft) return false;
    const original = toDraft(match);
    return original.courseId !== draft.courseId
      || original.date !== draft.date
      || original.time !== draft.time
      || original.status !== draft.status
      || original.notes !== draft.notes;
  }

  return (
    <div className={styles.logisticsGridWrap}>
      <table className={styles.logisticsGrid}>
        <thead>
          <tr>
            <th className={styles.gridStickyRound}>Round</th>
            <th className={styles.gridStickyMatchup}>Matchup</th>
            <th>Date</th>
            <th>Course</th>
            <th>Time</th>
            <th>Status</th>
            <th>Notes</th>
            <th>Save</th>
          </tr>
        </thead>
        <tbody>
          {orderedMatches.map((match) => {
            const round = roundById.get(match.roundId);
            const draft = drafts[match.id] ?? toDraft(match);
            const dirty = isDirty(match, draft);
            const saving = savingId === match.id;
            return (
              <tr key={match.id}>
                <td className={styles.gridStickyRound}>
                  <strong>R{round?.number ?? '?'}</strong>
                  <small>{round?.name ?? ''}</small>
                </td>
                <td className={styles.gridStickyMatchup}>
                  <strong>{getTeamName(match.awayTeamId, teams)}</strong>
                  <span>@</span>
                  <strong>{getTeamName(match.homeTeamId, teams)}</strong>
                </td>
                <td>
                  <input
                    aria-label={`Date for ${getTeamName(match.awayTeamId, teams)} at ${getTeamName(match.homeTeamId, teams)}`}
                    type="date"
                    value={draft.date ?? ''}
                    disabled={!editable || saving}
                    onChange={(event) => setDraftField(match.id, 'date', event.target.value)}
                  />
                </td>
                <td>
                  <select
                    aria-label={`Course for ${getTeamName(match.awayTeamId, teams)} at ${getTeamName(match.homeTeamId, teams)}`}
                    value={draft.courseId ?? ''}
                    disabled={!editable || saving}
                    onChange={(event) => setDraftField(match.id, 'courseId', event.target.value)}
                  >
                    <option value="">Select course</option>
                    {courses.filter((course) => course.active).map((course) => (
                      <option key={course.id} value={course.id}>{course.name}</option>
                    ))}
                  </select>
                </td>
                <td>
                  <input
                    aria-label={`Time for ${getTeamName(match.awayTeamId, teams)} at ${getTeamName(match.homeTeamId, teams)}`}
                    type="time"
                    value={draft.time ?? ''}
                    disabled={!editable || saving}
                    onChange={(event) => setDraftField(match.id, 'time', event.target.value)}
                  />
                </td>
                <td>
                  <select
                    aria-label={`Status for ${getTeamName(match.awayTeamId, teams)} at ${getTeamName(match.homeTeamId, teams)}`}
                    value={draft.status}
                    disabled={!editable || saving}
                    onChange={(event) => setDraftField(match.id, 'status', event.target.value as Draft['status'])}
                  >
                    {MATCH_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </select>
                </td>
                <td>
                  <input
                    aria-label={`Notes for ${getTeamName(match.awayTeamId, teams)} at ${getTeamName(match.homeTeamId, teams)}`}
                    type="text"
                    value={draft.notes}
                    disabled={!editable || saving}
                    placeholder="Optional"
                    onChange={(event) => setDraftField(match.id, 'notes', event.target.value)}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className={styles.gridSaveButton}
                    disabled={!editable || !dirty || saving}
                    onClick={() => void onSave(match, draft)}
                  >
                    {saving ? 'Saving…' : dirty ? 'Save' : 'Saved'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
