'use client';

import {useMemo, useState} from 'react';
import type {
  ClashPulseContextFilter,
  ClashPulseFactAngle,
  ClashPulseFactCandidate,
  ClashPulseFactData,
  ClashPulseStoryType,
} from './clashPulseFacts';
import styles from './AroundTheClashDesk.module.css';

const storyTypes: ClashPulseStoryType[] = ['Upset', 'Match Upset', 'CI Mover', 'Close Match', 'Standout'];
const contexts: ClashPulseContextFilter[] = ['All', 'Team', 'Singles', 'Doubles', 'Home', 'Road'];

type CardView = {
  candidate: ClashPulseFactCandidate;
  angle: ClashPulseFactAngle;
};

export function AroundTheClashDesk({factData}: {factData: ClashPulseFactData}) {
  const [scopeId, setScopeId] = useState(factData.defaultScopeId);
  const [storyType, setStoryType] = useState<ClashPulseStoryType | 'Top Facts'>('Top Facts');
  const [context, setContext] = useState<ClashPulseContextFilter>('All');
  const [selected, setSelected] = useState<Record<string, ClashPulseStoryType>>({});
  const [mobileQueueOpen, setMobileQueueOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState('');

  const activeScope = factData.scopes.find((scope) => scope.id === scopeId) ?? factData.scopes[0];
  const allCandidates = useMemo(
    () => factData.scopes.flatMap((scope) => scope.candidates),
    [factData.scopes],
  );
  const candidateById = useMemo(
    () => new Map(allCandidates.map((item) => [item.id, item])),
    [allCandidates],
  );

  const storyCounts = useMemo(() => {
    const counts = new Map<ClashPulseStoryType, number>();
    for (const item of activeScope?.candidates ?? []) {
      for (const type of storyTypes) {
        if (item.angles[type]) counts.set(type, (counts.get(type) ?? 0) + 1);
      }
    }
    return counts;
  }, [activeScope]);

  const visible = useMemo<CardView[]>(() => {
    if (!activeScope) return [];

    const candidates = storyType === 'Top Facts'
      ? activeScope.topFactIds
          .map((id) => activeScope.candidates.find((item) => item.id === id))
          .filter((item): item is ClashPulseFactCandidate => Boolean(item))
      : activeScope.candidates.filter((item) => Boolean(item.angles[storyType]));

    return candidates
      .filter((item) => matchesContext(item, context))
      .map((candidate) => {
        const angleType = storyType === 'Top Facts' ? candidate.primaryStoryType : storyType;
        const angle = candidate.angles[angleType];
        return angle ? {candidate, angle} : null;
      })
      .filter((item): item is CardView => Boolean(item));
  }, [activeScope, context, storyType]);

  const selectedItems = Object.entries(selected)
    .map(([id, angleType]) => {
      const candidate = candidateById.get(id);
      const angle = candidate?.angles[angleType];
      return candidate && angle ? {candidate, angle} : null;
    })
    .filter((item): item is CardView => Boolean(item));

  function toggleSelected(candidateId: string, angleType: ClashPulseStoryType) {
    setSelected((current) => {
      const next = {...current};
      if (next[candidateId] === angleType) {
        delete next[candidateId];
      } else {
        next[candidateId] = angleType;
      }
      return next;
    });
  }

  function clearSelected() {
    setSelected({});
    setMobileQueueOpen(false);
  }

  async function publishSelected() {
    if (!selectedItems.length || publishing) return;
    setPublishing(true);
    setMessage('');

    try {
      for (const item of selectedItems) {
        const response = await fetch('/api/clash-pulse', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            category: publicCategory(item.angle.storyType, item.candidate.format),
            text: item.angle.pulseText,
          }),
        });
        const payload = await response.json() as {error?: string};
        if (!response.ok) throw new Error(payload.error || 'Could not publish Clash Pulse fact.');
      }

      const count = selectedItems.length;
      clearSelected();
      setMessage(`${count} fact${count === 1 ? '' : 's'} published to the homepage Clash Pulse.`);
      window.dispatchEvent(new Event('clash-pulse-updated'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not publish Clash Pulse facts.');
    } finally {
      setPublishing(false);
    }
  }

  if (!activeScope) {
    return (
      <div className={styles.previewNote}>
        <div><strong>No rated facts are available yet.</strong></div>
      </div>
    );
  }

  return (
    <div className={styles.desk}>
      <div className={styles.previewNote}>
        <div>
          <strong>One result, multiple fact angles.</strong>{' '}
          Each filter now shows its own statistic: Upsets shows win probability, CI Movers shows CI movement, and Close Matches shows matchup closeness. Selecting a different angle for the same contest replaces the earlier angle in your Pulse Queue.
          {' '}
          {factData.currentSeasonHasResults
            ? 'Latest Round is selected automatically; Season and All-Time remain available for broader history.'
            : '2026–27 has no published Matchday results yet, so these are verified historical stories.'}
        </div>
      </div>

      <div className={styles.controls}>
        <span className={styles.filterLabel}>{factData.currentSeasonHasResults ? 'Scope' : 'Season'}</span>
        <div className={styles.scopeRow} aria-label="Clash Pulse scope">
          {factData.scopes.map((scope) => (
            <button
              className={styles.filterButton}
              key={scope.id}
              type="button"
              onClick={() => {
                setScopeId(scope.id);
                setStoryType('Top Facts');
                setContext('All');
              }}
              aria-pressed={scope.id === activeScope.id}
            >
              {scope.label}
            </button>
          ))}
        </div>

        <span className={styles.filterLabel}>Fact angle</span>
        <nav className={styles.categoryRow} aria-label="Clash Pulse fact angles">
          <button
            className={styles.filterButton}
            type="button"
            onClick={() => setStoryType('Top Facts')}
            aria-pressed={storyType === 'Top Facts'}
          >
            Top Facts {activeScope.topFactIds.length}
          </button>
          {storyTypes
            .filter((item) => (storyCounts.get(item) ?? 0) > 0)
            .map((item) => (
              <button
                className={styles.filterButton}
                key={item}
                type="button"
                onClick={() => setStoryType(item)}
                aria-pressed={storyType === item}
              >
                {labelStoryType(item)} {storyCounts.get(item)}
              </button>
            ))}
        </nav>

        <span className={styles.filterLabel}>Context</span>
        <div className={styles.contextRow} aria-label="Clash Pulse context filters">
          {contexts.map((item) => (
            <button
              className={styles.contextButton}
              key={item}
              type="button"
              onClick={() => setContext(item)}
              aria-pressed={context === item}
            >
              {item === 'All' ? 'All Results' : item === 'Team' ? 'Team Matches' : item}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.workspace}>
        <section className={styles.factPanel}>
          <header className={styles.factHeader}>
            <div>
              <h3>{storyType === 'Top Facts' ? 'Top facts' : labelStoryType(storyType)}</h3>
            </div>
            <span>{activeScope.label} · {activeScope.description}</span>
          </header>

          <div className={styles.factList}>
            {visible.map(({candidate, angle}) => {
              const isSelected = selected[candidate.id] === angle.storyType;
              const anotherAngleSelected = Boolean(selected[candidate.id]) && !isSelected;
              return (
                <button
                  className={styles.factCard}
                  type="button"
                  key={candidate.id}
                  onClick={() => toggleSelected(candidate.id, angle.storyType)}
                  aria-pressed={isSelected}
                >
                  <span className={styles.check} aria-hidden="true">{isSelected ? '✓' : '✓'}</span>
                  <span className={styles.factBody}>
                    <span className={styles.factMeta}>
                      {labelStoryType(angle.storyType)}
                      <span className={styles.factValue}>{angle.value}</span>
                    </span>
                    <strong className={styles.factHeadline}>{angle.headline}</strong>
                    <span className={styles.factDetail}>{candidate.detail}</span>
                    <span className={styles.badges}>
                      {angle.badges.map((badge) => (
                        <span className={styles.badge} key={badge}>{badge}</span>
                      ))}
                      {anotherAngleSelected ? (
                        <span className={styles.badge}>Tap to replace queued angle</span>
                      ) : null}
                    </span>
                  </span>
                </button>
              );
            })}
            {visible.length === 0 ? (
              <p className={styles.queueEmpty}>No facts match these filters.</p>
            ) : null}
          </div>
        </section>

        <PulseQueue
          className={styles.queue}
          selectedItems={selectedItems}
          onRemove={(id, angleType) => toggleSelected(id, angleType)}
          onClear={clearSelected}
          onPublish={publishSelected}
          publishing={publishing}
          message={message}
        />
      </div>

      {selectedItems.length > 0 ? (
        <div className={styles.mobileQueue}>
          <div className={styles.mobileQueueSummary}>
            <strong>Pulse Queue · {selectedItems.length}</strong>
            <button
              className={styles.mobileQueueButton}
              type="button"
              onClick={() => setMobileQueueOpen((current) => !current)}
              aria-expanded={mobileQueueOpen}
            >
              {mobileQueueOpen ? 'Hide queue' : 'View queue'}
            </button>
          </div>
          {mobileQueueOpen ? (
            <div className={styles.mobileQueuePanel}>
              <PulseQueue
                className={styles.mobileQueueContents}
                selectedItems={selectedItems}
                onRemove={(id, angleType) => toggleSelected(id, angleType)}
                onClear={clearSelected}
                onPublish={publishSelected}
                publishing={publishing}
                message={message}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function PulseQueue({
  selectedItems,
  onRemove,
  onClear,
  onPublish,
  publishing,
  message,
  className,
}: {
  selectedItems: CardView[];
  onRemove: (id: string, angleType: ClashPulseStoryType) => void;
  onClear: () => void;
  onPublish: () => void;
  publishing: boolean;
  message: string;
  className?: string;
}) {
  return (
    <aside className={className}>
      <div className={styles.queueHeader}>
        <strong>Pulse Queue · {selectedItems.length}</strong>
        {selectedItems.length > 0 ? (
          <button className={styles.clearButton} type="button" onClick={onClear}>Clear</button>
        ) : null}
      </div>

      {selectedItems.length === 0 ? (
        <p className={styles.queueEmpty}>Tap the specific fact angle you want to publish. Each contest can only occupy one queue slot.</p>
      ) : (
        <div className={styles.queueItems}>
          {selectedItems.map(({candidate, angle}) => (
            <div className={styles.queueItem} key={candidate.id}>
              <div>
                <strong>{angle.headline}</strong>
                <small>{labelStoryType(angle.storyType)} · {angle.value}</small>
              </div>
              <button
                className={styles.removeButton}
                type="button"
                onClick={() => onRemove(candidate.id, angle.storyType)}
                aria-label={`Remove ${angle.headline} from Pulse Queue`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        className={styles.publishButton}
        type="button"
        disabled={!selectedItems.length || publishing}
        onClick={onPublish}
      >
        {publishing ? 'Publishing…' : 'Publish to Clash Pulse'}
      </button>
      {message ? <span className={styles.queueHint}>{message}</span> : null}
    </aside>
  );
}

function matchesContext(item: ClashPulseFactCandidate, context: ClashPulseContextFilter): boolean {
  if (context === 'All') return true;
  if (context === 'Singles' || context === 'Doubles' || context === 'Team') return item.format === context;
  return item.venue === context;
}

function labelStoryType(type: ClashPulseStoryType): string {
  if (type === 'Upset') return 'Upsets';
  if (type === 'Match Upset') return 'Match Upsets';
  if (type === 'CI Mover') return 'CI Movers';
  if (type === 'Close Match') return 'Close Matches';
  return 'Standouts';
}

function publicCategory(type: ClashPulseStoryType, format: 'Singles' | 'Doubles' | 'Team'): string {
  if (type === 'Upset' || type === 'Match Upset') return 'Upset';
  if (type === 'CI Mover') return 'Clash Index';
  if (format === 'Doubles') return 'Doubles';
  return 'League';
}
