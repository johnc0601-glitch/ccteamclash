'use client';

import {useEffect, useMemo, useState} from 'react';
import {refreshPublicSchedule} from '@/app/office/schedule/cache-actions';
import {MatchLogisticsGrid} from '@/components/schedule/MatchLogisticsGrid';
import {services} from '@/core/ServiceContainer';
import type {Course} from '@/domain/course/Course';
import type {Match} from '@/domain/schedule/Match';
import type {Round} from '@/domain/schedule/Round';
import type {Schedule} from '@/domain/schedule/Schedule';
import type {Season} from '@/domain/season/Season';
import type {Team} from '@/models/Team';
import styles from './ScheduleSpreadsheetManagement.module.css';

type Message = {type: 'success' | 'error'; text: string} | null;

type LogisticsDraft = Pick<Match, 'courseId' | 'date' | 'time' | 'status' | 'notes'>;

export function ScheduleSpreadsheetManagement() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadBaseData() {
      try {
        const [nextSchedules, nextSeasons, nextTeams, nextCourses] = await Promise.all([
          services.schedules.getSchedules({search: '', seasonId: 'all', publication: 'all'}),
          services.seasons.getAll(),
          services.schedules.getTeams(),
          services.schedules.getCourses(),
        ]);
        if (cancelled) return;

        setSchedules(nextSchedules);
        setSeasons(nextSeasons);
        setTeams(nextTeams);
        setCourses(nextCourses);

        const activeSeason = nextSeasons.find((season) => season.active && !season.archived);
        const preferredSchedule = activeSeason
          ? nextSchedules.find((schedule) => schedule.seasonId === activeSeason.id)
          : undefined;
        setSelectedScheduleId(preferredSchedule?.id ?? nextSchedules[0]?.id ?? '');
      } catch {
        if (!cancelled) setMessage({type: 'error', text: 'Schedule data could not be loaded.'});
      }
    }

    void loadBaseData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadScheduleRows() {
      if (!selectedScheduleId) {
        setRounds([]);
        setMatches([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const nextRounds = await services.schedules.getRounds(selectedScheduleId);
        const matchGroups = await Promise.all(
          nextRounds.map((round) => services.schedules.getMatches(round.id)),
        );
        if (cancelled) return;
        setRounds(nextRounds);
        setMatches(matchGroups.flat());
      } catch {
        if (!cancelled) setMessage({type: 'error', text: 'Matches could not be loaded.'});
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadScheduleRows();
    return () => {
      cancelled = true;
    };
  }, [selectedScheduleId]);

  const selectedSchedule = schedules.find((schedule) => schedule.id === selectedScheduleId);
  const selectedSeason = selectedSchedule
    ? seasons.find((season) => season.id === selectedSchedule.seasonId)
    : undefined;
  const editable = Boolean(selectedSeason?.active && !selectedSeason.archived);

  const orderedSchedules = useMemo(() => [...schedules].sort((left, right) => {
    const leftSeason = seasons.find((season) => season.id === left.seasonId);
    const rightSeason = seasons.find((season) => season.id === right.seasonId);
    if (leftSeason?.active && !rightSeason?.active) return -1;
    if (rightSeason?.active && !leftSeason?.active) return 1;
    return (rightSeason?.year ?? 0) - (leftSeason?.year ?? 0);
  }), [schedules, seasons]);

  async function handleSave(match: Match, draft: LogisticsDraft) {
    setSavingId(match.id);
    setMessage(null);
    try {
      const result = await services.matchLogistics.update(match.id, draft);
      if (!result.ok) {
        setMessage({type: 'error', text: result.message});
        return;
      }
      setMatches((current) => current.map((candidate) => (
        candidate.id === result.data.id ? result.data : candidate
      )));

      let publicRefreshFailed = false;
      try {
        await refreshPublicSchedule(result.data.id);
      } catch {
        publicRefreshFailed = true;
      }

      setMessage({
        type: 'success',
        text: publicRefreshFailed
          ? `${getTeamName(match.awayTeamId)} @ ${getTeamName(match.homeTeamId)} updated. Public cards may take up to a minute to refresh.`
          : `${getTeamName(match.awayTeamId)} @ ${getTeamName(match.homeTeamId)} updated and public schedule refreshed.`,
      });
    } catch {
      setMessage({type: 'error', text: 'The match could not be saved.'});
    } finally {
      setSavingId(null);
    }
  }

  function getTeamName(teamId: string | null) {
    return teams.find((team) => team.id === teamId)?.name ?? teamId ?? 'TBD';
  }

  return (
    <section className={styles.management}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>Schedule management</span>
          <h1>Match Schedule Editor</h1>
          <p>Every match in one place. Teams and home/away are locked; edit the event details directly in the grid.</p>
        </div>
        <label className={styles.seasonPicker}>
          <span>Season</span>
          <select value={selectedScheduleId} onChange={(event) => setSelectedScheduleId(event.target.value)}>
            {orderedSchedules.map((schedule) => {
              const season = seasons.find((candidate) => candidate.id === schedule.seasonId);
              return <option key={schedule.id} value={schedule.id}>{season?.name ?? schedule.name}</option>;
            })}
          </select>
        </label>
      </header>

      <div className={styles.summaryBar}>
        <div><strong>{rounds.length}</strong><span>Rounds</span></div>
        <div><strong>{matches.length}</strong><span>Matches</span></div>
        <p>
          <b>Locked:</b> matchup + home/away
          <span>•</span>
          <b>Editable:</b> date, course, time, status, notes
        </p>
      </div>

      {message ? (
        <div className={message.type === 'success' ? styles.success : styles.error} role={message.type === 'error' ? 'alert' : 'status'}>
          {message.text}
        </div>
      ) : null}

      {loading ? <div className={styles.loading}>Loading the full schedule…</div> : null}

      {!loading && !selectedSchedule ? (
        <div className={styles.empty}>No schedule is available.</div>
      ) : null}

      {!loading && selectedSchedule ? (
        <>
          {!editable ? (
            <div className={styles.readOnly}>This season is historical and is shown read-only.</div>
          ) : null}
          <MatchLogisticsGrid
            rounds={rounds}
            matches={matches}
            teams={teams}
            courses={courses}
            editable={editable}
            savingId={savingId}
            onSave={handleSave}
          />
          <p className={styles.helpText}>On a phone, swipe the grid sideways. Round and matchup stay pinned while you edit the remaining columns.</p>
        </>
      ) : null}
    </section>
  );
}
