'use client';

import {useEffect, useMemo, useState} from 'react';
import type {Course} from '@/domain/course/Course';
import {MATCH_STATUSES, type Match, type MatchInput} from '@/domain/schedule/Match';
import type {Round} from '@/domain/schedule/Round';
import type {Team} from '@/models/Team';
import {formatScheduleDate, getTeamName} from '@/components/schedule/scheduleDisplay';
import styles from './ScheduleSpreadsheetManagement.module.css';

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
    setDrafts(Object.fromEntries(matches.map((match) => [match.id, toDraft(match)]));
  }, [matches]);

  const activeCourses = useMemo(
    () => courses.filter((course) => course.active).sort((left, right) => left.name.localeCompare(right.name)),
    [courses],
  );

  const roundGroups = useMemo(() => [...rounds]
    .sort((left, right) => left.number - right.number)
    .map((round) => ({
      round,
      matches: matches
        .filter((match) => match.roundId === round.id)
        .sort((left, right) => (left.time ?? '').localeCompare(right.time ?? '')
          || getTeamName(left.awayTeamId, teams).localeCompare(getTeamName(right.awayTeamId, teams))),
    }))
    .filter((group) => group.matches.length > 0), [matches, rounds, teams]);

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
            <th
              style={{
                position: 'sticky',
                right: 0,
                zIndex: 9,
                minWidth: 96,
                width: 96,
                background: '#141719',
                boxShadow: '-10px 0 14px -14px rgba(0, 0, 0, .9)',
              }}
            >
              Save
            </th>
          </tr>
        </thead>
        {roundGroups.map(({round, matches: roundMatches}) => (
          <tbody key={round.id} className={styles.roundGroup}>
            <tr className={styles.roundDivider}>
              <th colSpan={8}>
                <div className={styles.roundDividerContent}>
                  <strong>Round {round.number}</strong>
                  <span>{round.name}</span>
                  <span>{formatScheduleDate(round.date)}</span>
                  <span>{roundMatches.length} matches</span>
                </div>
              </th>
            </tr>
            {roundMatches.map((match) => {
              const draft = drafts[match.id] ?? toDraft(match);
              const dirty = isDirty(match, draft);
              const saving = savingId === match.id;
              const awayName = getTeamName(match.awayTeamId, teams);
              const homeName = getTeamName(match.homeTeamId, teams);

              return (
                <tr key={match.id} className={dirty ? styles.dirtyRow : undefined}>
                  <td className={styles.gridStickyRound}>
                    <strong>R{round.number}</strong>
                  </td>
                  <td className={styles.gridStickyMatchup}>
                    <span className={styles.matchupTeam}>{awayName}</span>
                    <span className={styles.matchupAt}>@</span>
                    <span className={styles.matchupTeam}>
                      {homeName}
                      <small className={styles.homeTag}>Home</small>
                    </span>
                  </td>
                  <td>
                    <input
                      aria-label={`Date for ${awayName} at ${homeName}`}
                      type="date"
                      value={draft.date ?? ''}
                      disabled={!editable || saving}
                      onChange={(event) => setDraftField(match.id, 'date', event.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      aria-label={`Course for ${awayName} at ${homeName}`}
                      value={draft.courseId ?? ''}
                      disabled={!editable || saving}
                      onChange={(event) => setDraftField(match.id, 'courseId', event.target.value)}
                    >
                      <option value="">Select course</option>
                      {activeCourses.map((course) => (
                        <option key={course.id} value={course.id}>{course.name}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      aria-label={`Time for ${awayName} at ${homeName}`}
                      type="time"
                      value={draft.time ?? ''}
                      disabled={!editable || saving}
                      onChange={(event) => setDraftField(match.id, 'time', event.target.value)}
                    />
                  </td>
                  <td>
                    <select
                      aria-label={`Status for ${awayName} at ${homeName}`}
                      className={styles.statusSelect}
                      data-status={draft.status}
                      value={draft.status}
                      disabled={!editable || saving}
                      onChange={(event) => setDraftField(match.id, 'status', event.target.value as Draft['status'])}
                    >
                      {MATCH_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>
                  </td>
                  <td style={{minWidth: 190, width: 190}}>
                    <input
                      aria-label={`Notes for ${awayName} at ${homeName}`}
                      type="text"
                      value={draft.notes}
                      disabled={!editable || saving}
                      placeholder="Optional"
                      onChange={(event) => setDraftField(match.id, 'notes', event.target.value)}
                    />
                  </td>
                  <td
                    style={{
                      position: 'sticky',
                      right: 0,
                      zIndex: 4,
                      minWidth: 96,
                      width: 96,
                      background: dirty ? '#fff9e7' : '#fff',
                      boxShadow: '-10px 0 14px -14px rgba(0, 0, 0, .9)',
                    }}
                  >
                    <button
                      type="button"
                      className={styles.gridSaveButton}
                      data-dirty={dirty ? 'true' : 'false'}
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
        ))}
      </table>
    </div>
  );
}
