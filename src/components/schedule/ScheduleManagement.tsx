'use client';

import {useEffect, useState} from 'react';
import {DialogShell} from '@/components/teams/DialogShell';
import {ConfirmationDialog} from '@/components/teams/ConfirmationDialog';
import {SearchBar} from '@/components/teams/SearchBar';
import {MatchCard} from '@/components/schedule/MatchCard';
import {MatchForm} from '@/components/schedule/MatchForm';
import {MatchTable} from '@/components/schedule/MatchTable';
import {RoundCard} from '@/components/schedule/RoundCard';
import {RoundForm, type RoundMatchValues} from '@/components/schedule/RoundForm';
import {RoundTable} from '@/components/schedule/RoundTable';
import {ScheduleCard} from '@/components/schedule/ScheduleCard';
import {
  ScheduleImportDialog,
  type ScheduleImportData,
} from '@/components/schedule/ScheduleImportDialog';
import {ScheduleTable} from '@/components/schedule/ScheduleTable';
import {ScheduleToolbar} from '@/components/schedule/ScheduleToolbar';
import {StatusBadge} from '@/components/schedule/StatusBadge';
import {
  formatScheduleDate,
  formatScheduleTime,
  getCourseName,
  getSeasonName,
  getTeamName,
} from '@/components/schedule/scheduleDisplay';
import {services} from '@/core/ServiceContainer';
import type {Course} from '@/domain/course/Course';
import type {Season} from '@/domain/season/Season';
import type {Match, MatchInput} from '@/domain/schedule/Match';
import type {Round, RoundInput} from '@/domain/schedule/Round';
import type {
  Schedule,
  ScheduleFieldErrors,
  SchedulePublicationFilter,
  ScheduleViewMode,
} from '@/domain/schedule/Schedule';
import type {Team} from '@/models/Team';
import styles from './ScheduleManagement.module.css';

type EditorState =
  | {kind: 'round'; mode: 'create'; schedule: Schedule}
  | {kind: 'round'; mode: 'edit'; round: Round; matches: Match[]}
  | {kind: 'match'; mode: 'create'; round: Round}
  | {kind: 'match'; mode: 'edit'; match: Match; schedulePublished: boolean}
  | null;

type ConfirmationState =
  | {kind: 'round'; item: Round}
  | {kind: 'match'; item: Match}
  | null;

type Message = {type: 'success' | 'error'; text: string} | null;

export function ScheduleManagement() {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [roundCounts, setRoundCounts] = useState<Record<string, number>>({});
  const [matchCounts, setMatchCounts] = useState<Record<string, number>>({});
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null);
  const [selectedRound, setSelectedRound] = useState<Round | null>(null);
  const [detailsMatch, setDetailsMatch] = useState<Match | null>(null);
  const [search, setSearch] = useState('');
  const [roundSearch, setRoundSearch] = useState('');
  const [matchSearch, setMatchSearch] = useState('');
  const [seasonId, setSeasonId] = useState('all');
  const [publication, setPublication] = useState<SchedulePublicationFilter>('all');
  const [view, setView] = useState<ScheduleViewMode>('table');
  const [editor, setEditor] = useState<EditorState>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationState>(null);
  const [fieldErrors, setFieldErrors] = useState<ScheduleFieldErrors>({});
  const [message, setMessage] = useState<Message>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const selectedScheduleId = selectedSchedule?.id;
  const selectedRoundId = selectedRound?.id;

  useEffect(() => {
    let cancelled = false;

    async function loadWorkspace() {
      try {
        const [nextSeasons, nextTeams, nextCourses, nextSchedules] = await Promise.all([
          services.seasons.getAll(),
          services.schedules.getTeams(),
          services.schedules.getCourses(),
          services.schedules.getSchedules({search, seasonId, publication}),
        ]);
        const scheduleRoundGroups = await Promise.all(
          nextSchedules.map((schedule) => services.schedules.getRounds(schedule.id)),
        );

        if (cancelled) return;
        setSeasons(nextSeasons);
        setTeams(nextTeams);
        setCourses(nextCourses);
        setSchedules(nextSchedules);
        setRoundCounts(Object.fromEntries(nextSchedules.map((schedule, index) => [
          schedule.id,
          scheduleRoundGroups[index].length,
        ])));

        if (selectedScheduleId) {
          const [freshSchedule, nextRounds] = await Promise.all([
            services.schedules.getSchedule(selectedScheduleId),
            services.schedules.getRounds(selectedScheduleId, roundSearch),
          ]);
          if (cancelled) return;
          if (!freshSchedule) {
            setSelectedSchedule(null);
            setSelectedRound(null);
            setRounds([]);
            setMatches([]);
          } else {
            const roundMatchGroups = await Promise.all(
              nextRounds.map((round) => services.schedules.getMatches(round.id)),
            );
            if (cancelled) return;
            setSelectedSchedule(freshSchedule);
            setRounds(nextRounds);
            setMatchCounts(Object.fromEntries(nextRounds.map((round, index) => [
              round.id,
              roundMatchGroups[index].length,
            ])));
          }
        }

        if (selectedRoundId) {
          const [freshRound, nextMatches] = await Promise.all([
            services.schedules.getRound(selectedRoundId),
            services.schedules.getMatches(selectedRoundId, matchSearch),
          ]);
          if (cancelled) return;
          if (!freshRound) {
            setSelectedRound(null);
            setMatches([]);
          } else {
            setSelectedRound(freshRound);
            setMatches(nextMatches);
          }
        }
        setLoading(false);
      } catch {
        if (cancelled) return;
        setMessage({type: 'error', text: 'Schedule data could not be loaded.'});
        setLoading(false);
      }
    }

    loadWorkspace();
    return () => {
      cancelled = true;
    };
  }, [matchSearch, publication, revision, roundSearch, search, seasonId, selectedRoundId, selectedScheduleId]);

  const activeSeason = seasons.find((season) => season.active && !season.archived);
  const selectedSeason = selectedSchedule
    ? seasons.find((season) => season.id === selectedSchedule.seasonId)
    : undefined;
  const canManageSelected = Boolean(selectedSeason?.active && !selectedSeason.archived);
  const canEditStructure = canManageSelected && !selectedSchedule?.published;

  function refresh(successText: string) {
    setMessage({type: 'success', text: successText});
    setRevision((current) => current + 1);
  }

  function openEditor(nextEditor: Exclude<EditorState, null>) {
    setFieldErrors({});
    setMessage(null);
    setEditor(nextEditor);
  }

  async function openRoundEditor(round: Round) {
    try {
      const roundMatches = await services.schedules.getMatches(round.id);
      openEditor({kind: 'round', mode: 'edit', round, matches: roundMatches});
    } catch {
      setMessage({type: 'error', text: 'Round matches could not be loaded.'});
    }
  }

  function selectSchedule(schedule: Schedule) {
    setSelectedSchedule(schedule);
    setSelectedRound(null);
    setDetailsMatch(null);
    setRounds([]);
    setMatches([]);
    setRoundSearch('');
    setMatchSearch('');
  }

  function selectRound(round: Round) {
    setSelectedRound(round);
    setDetailsMatch(null);
    setMatches([]);
    setMatchSearch('');
  }

  async function beginManualSchedule() {
    if (!activeSeason) return;
    setSubmitting(true);
    try {
      const result = await services.schedules.ensureSchedule(activeSeason.id);
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setMessage({type: 'error', text: result.message});
        return;
      }
      setSelectedSchedule(result.data);
      setSelectedRound(null);
      setRounds([]);
      setMatches([]);
      openEditor({kind: 'round', mode: 'create', schedule: result.data});
    } catch (error) {
      setMessage({type: 'error', text: getErrorMessage(error, 'The schedule builder could not be opened.')});
    } finally {
      setSubmitting(false);
    }
  }

  async function handleScheduleImport(data: ScheduleImportData) {
    setSubmitting(true);
    try {
      const result = await services.schedules.importSchedule(data);
      if (!result.ok) throw new Error(result.message);

      setImportOpen(false);
      setSelectedSchedule(result.data);
      setSelectedRound(null);
      refresh('Schedule imported as a draft.');
    } catch (error) {
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'Schedule could not be imported.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRoundSubmit(values: RoundInput, roundMatches: RoundMatchValues[]) {
    if (!editor || editor.kind !== 'round') return;
    setSubmitting(true);
    try {
      if (editor.mode === 'create') {
        const result = await services.schedules.createRound(editor.schedule.id, values);
        if (!result.ok) {
          setFieldErrors(result.fieldErrors ?? {});
          setMessage({type: 'error', text: result.message});
          return;
        }
        setEditor(null);
        setSelectedRound(result.data);
        refresh('Round created.');
        return;
      }

      const result = await services.schedules.updateRoundWithMatches(
        editor.round.id,
        values,
        roundMatches,
      );
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setMessage({type: 'error', text: result.message});
        return;
      }
      setEditor(null);
      setSelectedRound(result.data.round);
      setMatches(result.data.matches);
      refresh('Round and matches updated.');
    } catch (error) {
      setMessage({type: 'error', text: getErrorMessage(error, 'Round could not be saved.')});
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMatchSubmit(values: MatchInput) {
    if (!editor || editor.kind !== 'match') return;
    setSubmitting(true);
    try {
      const result = editor.mode === 'create'
        ? await services.schedules.createMatch(editor.round.id, values)
        : await services.schedules.updateMatch(editor.match.id, values);
      if (!result.ok) {
        setFieldErrors(result.fieldErrors ?? {});
        setMessage({type: 'error', text: result.message});
        return;
      }
      setEditor(null);
      setDetailsMatch(result.data);
      refresh(editor.mode === 'create' ? 'Match created.' : 'Match updated.');
    } catch (error) {
      setMessage({type: 'error', text: getErrorMessage(error, 'Match could not be saved.')});
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePublication(schedule: Schedule) {
    setProcessingId(schedule.id);
    try {
      const result = schedule.published
        ? await services.schedules.unpublishSchedule(schedule.id)
        : await services.schedules.publishSchedule(schedule.id);
      if (!result.ok) {
        setMessage({type: 'error', text: result.message});
        return;
      }
      if (selectedSchedule?.id === schedule.id) setSelectedSchedule(result.data);
      refresh(schedule.published ? 'Schedule returned to draft.' : 'Schedule published. All rounds are now visible.');
    } catch (error) {
      setMessage({type: 'error', text: getErrorMessage(error, 'Publication status could not be changed.')});
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDelete() {
    if (!confirmation) return;
    setSubmitting(true);
    try {
      const result = confirmation.kind === 'round'
          ? await services.schedules.deleteRound(confirmation.item.id)
          : await services.schedules.deleteMatch(confirmation.item.id);
      if (!result.ok) {
        setMessage({type: 'error', text: result.message});
        setConfirmation(null);
        return;
      }

      if (confirmation.kind === 'round') {
        setSelectedRound(null);
        setMatches([]);
      } else {
        setDetailsMatch(null);
      }
      const label = confirmation.kind === 'round' ? 'Round' : 'Match';
      setConfirmation(null);
      refresh(`${label} deleted.`);
    } catch (error) {
      setMessage({type: 'error', text: getErrorMessage(error, 'Item could not be deleted.')});
    } finally {
      setSubmitting(false);
    }
  }

  const scheduleActionProps = {
    onView: selectSchedule,
    onTogglePublication: handlePublication,
  };
  const roundActionProps = {
    onView: selectRound,
    onEdit: (round: Round) => void openRoundEditor(round),
    onDelete: (round: Round) => setConfirmation({kind: 'round', item: round}),
  };
  const matchActionProps = {
    onView: setDetailsMatch,
    onEdit: (match: Match) => {
      setDetailsMatch(null);
      openEditor({
        kind: 'match',
        mode: 'edit',
        match,
        schedulePublished: Boolean(selectedSchedule?.published),
      });
    },
    onDelete: (match: Match) => setConfirmation({kind: 'match', item: match}),
  };

  return (
    <section className={styles.management}>
      <ScheduleToolbar
        search={search}
        seasonId={seasonId}
        publication={publication}
        view={view}
        seasons={seasons}
        canImport={Boolean(activeSeason)}
        onSearchChange={setSearch}
        onSeasonChange={setSeasonId}
        onPublicationChange={setPublication}
        onViewChange={setView}
        onImport={() => {
          setMessage(null);
          setImportOpen(true);
        }}
      />

      {message ? (
        <div className={message.type === 'success' ? styles.successMessage : styles.errorMessage} role={message.type === 'error' ? 'alert' : 'status'}>
          {message.text}
        </div>
      ) : null}

      <div className={styles.listHeader}>
        <div><span>Schedule list</span><h2>{schedules.length} {schedules.length === 1 ? 'schedule' : 'schedules'}</h2></div>
        <p>{activeSeason ? `Active season: ${activeSeason.name}` : 'No active season'}</p>
      </div>

      {loading ? <div className={styles.loadingState}>Loading schedules...</div> : null}
      {!loading && schedules.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>No schedule found</h3>
          <p>Import a schedule, or begin adding rounds manually.</p>
          {activeSeason ? (
            <button
              type="button"
              className={styles.createButton}
              disabled={submitting}
              onClick={() => void beginManualSchedule()}
            >
              {submitting ? 'Opening...' : 'Build schedule'}
            </button>
          ) : null}
        </div>
      ) : null}

      {!loading && schedules.length > 0 && view === 'table' ? (
        <ScheduleTable
          schedules={schedules}
          seasons={seasons}
          roundCounts={roundCounts}
          activeSeasonId={activeSeason?.id}
          processingId={processingId}
          {...scheduleActionProps}
        />
      ) : null}

      {!loading && schedules.length > 0 && view === 'cards' ? (
        <div className={styles.cardGrid}>
          {schedules.map((schedule) => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              seasons={seasons}
              roundCount={roundCounts[schedule.id] ?? 0}
              canEdit={schedule.seasonId === activeSeason?.id}
              processing={processingId === schedule.id}
              {...scheduleActionProps}
            />
          ))}
        </div>
      ) : null}

      {selectedSchedule ? (
        <section className={styles.detailSection} aria-labelledby="selected-schedule-title">
          <header className={styles.detailHeader}>
            <div>
              <span>{getSeasonName(selectedSchedule.seasonId, seasons)}</span>
              <h2 id="selected-schedule-title">{selectedSchedule.name}</h2>
              <p>{selectedSchedule.description || 'No schedule description.'}</p>
            </div>
            <div className={styles.detailHeaderActions}>
              <StatusBadge status={selectedSchedule.published ? 'Published' : 'Draft'} />
              {canManageSelected ? (
                <button type="button" className={styles.primaryButton} disabled={processingId === selectedSchedule.id} onClick={() => handlePublication(selectedSchedule)}>
                  {selectedSchedule.published ? 'Unpublish' : 'Publish'}
                </button>
              ) : null}
            </div>
          </header>
          {selectedSchedule.published ? <p className={styles.lockNotice}>Published schedule data is locked. Unpublish this schedule before changing rounds or public match fields.</p> : null}
          <div className={styles.subToolbar}>
            <SearchBar value={roundSearch} onChange={setRoundSearch} label="Search rounds" placeholder="Search rounds, teams, or courses" />
            {canEditStructure ? (
              <button type="button" className={styles.createButton} onClick={() => openEditor({kind: 'round', mode: 'create', schedule: selectedSchedule})}>Add round</button>
            ) : null}
          </div>
          {rounds.length ? (
            <>
              <RoundTable rounds={rounds} matchCounts={matchCounts} canEdit={canEditStructure} {...roundActionProps} />
              <div className={`${styles.compactGrid} ${styles.mobileOnly}`}>
                {rounds.map((round) => <RoundCard key={round.id} round={round} matchCount={matchCounts[round.id] ?? 0} canEdit={canEditStructure} {...roundActionProps} />)}
              </div>
            </>
          ) : <div className={styles.inlineEmpty}>No rounds match this view.</div>}
        </section>
      ) : null}

      {selectedSchedule && selectedRound ? (
        <section className={styles.detailSection} aria-labelledby="selected-round-title">
          <header className={styles.detailHeader}>
            <div>
              <span>Round {selectedRound.number} / {formatScheduleDate(selectedRound.date)}</span>
              <h2 id="selected-round-title">{selectedRound.name}</h2>
              <p>{matches.length} {matches.length === 1 ? 'match' : 'matches'} in this view</p>
            </div>
            {canEditStructure ? (
              <button type="button" className={styles.secondaryButton} onClick={() => void openRoundEditor(selectedRound)}>Edit round</button>
            ) : null}
          </header>
          <div className={styles.subToolbar}>
            <SearchBar value={matchSearch} onChange={setMatchSearch} label="Search matches" placeholder="Search teams, courses, status, or notes" />
            {canEditStructure ? (
              <button type="button" className={styles.createButton} onClick={() => openEditor({kind: 'match', mode: 'create', round: selectedRound})}>Add match</button>
            ) : null}
          </div>
          {matches.length ? (
            <>
              <MatchTable
                matches={matches}
                teams={teams}
                courses={courses}
                canEditNotes={canManageSelected}
                canEditPublicFields={canEditStructure}
                {...matchActionProps}
              />
              <div className={`${styles.compactGrid} ${styles.mobileOnly}`}>
                {matches.map((match) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    teams={teams}
                    courses={courses}
                    canEditNotes={canManageSelected}
                    canEditPublicFields={canEditStructure}
                    {...matchActionProps}
                  />
                ))}
              </div>
            </>
          ) : <div className={styles.inlineEmpty}>No matches match this view.</div>}
        </section>
      ) : null}

      {importOpen ? (
        <ScheduleImportDialog
          seasons={seasons}
          teams={teams}
          courses={courses}
          importing={submitting}
          onImport={handleScheduleImport}
          onClose={() => setImportOpen(false)}
        />
      ) : null}

      {editor?.kind === 'round' ? (
        <DialogShell
          title={editor.mode === 'create' ? 'Create round' : 'Edit round'}
          eyebrow="Round management"
          onClose={() => setEditor(null)}
          size={editor.mode === 'edit' ? 'large' : 'default'}
        >
          <RoundForm
            initialValues={editor.mode === 'create' ? {
              number: Math.max(0, ...rounds.map((round) => round.number)) + 1,
              name: '',
              date: selectedSeason?.startDate ?? '',
            } : {
              number: editor.round.number,
              name: editor.round.name,
              date: editor.round.date ?? '',
            }}
            initialMatches={editor.mode === 'edit' ? editor.matches.map((match) => ({
              id: match.id,
              input: {
                homeTeamId: match.homeTeamId ?? '',
                awayTeamId: match.awayTeamId ?? '',
                courseId: match.courseId ?? '',
                date: match.date ?? editor.round.date ?? '',
                time: match.time ?? '',
                status: match.status,
                notes: match.notes,
              },
            })) : []}
            teams={teams}
            courses={courses}
            fieldErrors={fieldErrors}
            submitLabel={editor.mode === 'create' ? 'Create round' : 'Save round'}
            submitting={submitting}
            onSubmit={handleRoundSubmit}
            onCancel={() => setEditor(null)}
          />
        </DialogShell>
      ) : null}

      {editor?.kind === 'match' ? (
        <DialogShell
          title={editor.mode === 'create' ? 'Create match' : 'Edit match'}
          eyebrow="Match management"
          onClose={() => setEditor(null)}
          size="large"
        >
          <MatchForm
            initialValues={editor.mode === 'create' ? {
              homeTeamId: '',
              awayTeamId: '',
              courseId: '',
              date: editor.round.date ?? '',
              time: '09:00',
              status: 'Scheduled',
              notes: '',
            } : {
              homeTeamId: editor.match.homeTeamId ?? '',
              awayTeamId: editor.match.awayTeamId ?? '',
              courseId: editor.match.courseId ?? '',
              date: editor.match.date ?? '',
              time: editor.match.time ?? '',
              status: editor.match.status,
              notes: editor.match.notes,
            }}
            teams={teams}
            courses={courses}
            fieldErrors={fieldErrors}
            submitLabel={editor.mode === 'create' ? 'Create match' : 'Save match'}
            submitting={submitting}
            publicFieldsLocked={editor.mode === 'edit' && editor.schedulePublished}
            onSubmit={handleMatchSubmit}
            onCancel={() => setEditor(null)}
          />
        </DialogShell>
      ) : null}

      {detailsMatch ? (
        <DialogShell title="Match details" eyebrow={selectedRound?.name ?? 'Schedule match'} onClose={() => setDetailsMatch(null)} size="large">
          <div className={styles.detailsBody}>
            <div className={styles.matchDetailsLead}>
              <div><span>Home team</span><strong>{getTeamName(detailsMatch.homeTeamId, teams)}</strong></div>
              <b>vs</b>
              <div><span>Away team</span><strong>{getTeamName(detailsMatch.awayTeamId, teams)}</strong></div>
            </div>
            <dl className={styles.detailsGrid}>
              <div><dt>Course</dt><dd>{getCourseName(detailsMatch.courseId, courses)}</dd></div>
              <div><dt>Status</dt><dd><StatusBadge status={detailsMatch.status} /></dd></div>
              <div><dt>Date</dt><dd>{formatScheduleDate(detailsMatch.date)}</dd></div>
              <div><dt>Time</dt><dd>{formatScheduleTime(detailsMatch.time)}</dd></div>
              <div className={styles.detailsFull}><dt>Internal notes</dt><dd>{detailsMatch.notes || 'No internal notes.'}</dd></div>
            </dl>
            <div className={styles.dialogActions}>
              <button type="button" className={styles.secondaryButton} onClick={() => setDetailsMatch(null)}>Close</button>
              {canManageSelected ? <button type="button" className={styles.primaryButton} onClick={() => matchActionProps.onEdit(detailsMatch)}>{canEditStructure ? 'Edit match' : 'Edit notes'}</button> : null}
            </div>
          </div>
        </DialogShell>
      ) : null}

      {confirmation ? (
        <ConfirmationDialog
          title={`Delete ${confirmation.kind}?`}
          message={confirmation.kind === 'round'
            ? `${confirmation.item.name} and all of its matches will be permanently removed.`
            : `${getTeamName(confirmation.item.homeTeamId, teams)} vs ${getTeamName(confirmation.item.awayTeamId, teams)} will be permanently removed.`}
          confirmLabel={`Delete ${confirmation.kind}`}
          destructive
          submitting={submitting}
          onConfirm={handleDelete}
          onClose={() => setConfirmation(null)}
        />
      ) : null}
    </section>
  );
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}
