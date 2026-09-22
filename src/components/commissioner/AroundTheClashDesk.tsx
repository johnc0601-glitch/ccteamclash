'use client';

import {useMemo, useState} from 'react';
import type {
  ClashPulseFactCandidate,
  ClashPulseFactCategory,
  ClashPulseFactData,
} from './clashPulseFacts';
import styles from './AroundTheClashDesk.module.css';

const categories: ClashPulseFactCategory[] = [
  'Upsets',
  'CI Gaps',
  'Above Expected',
  'Road',
  'Home',
  'Singles',
  'Doubles',
  'CI +/-',
  'Closest',
];

export function AroundTheClashDesk({factData}: {factData: ClashPulseFactData}) {
  const [scopeId, setScopeId] = useState(factData.defaultScopeId);
  const [category, setCategory] = useState<ClashPulseFactCategory | 'All'>('All');
  const [selected, setSelected] = useState<string[]>([]);
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

  const categoryCounts = useMemo(() => {
    const counts = new Map<ClashPulseFactCategory, number>();
    for (const item of activeScope?.candidates ?? []) {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    }
    return counts;
  }, [activeScope]);

  const visible = useMemo(() => {
    if (!activeScope) return [];
    if (category !== 'All') {
      return activeScope.candidates.filter((item) => item.category === category);
    }

    return categories.flatMap((item) =>
      activeScope.candidates.filter((candidate) => candidate.category === item).slice(0, 2),
    );
  }, [activeScope, category]);

  const selectedItems = selected
    .map((id) => candidateById.get(id))
    .filter((item): item is ClashPulseFactCandidate => Boolean(item));

  function toggleSelected(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function clearSelected() {
    setSelected([]);
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
            category: publicCategory(item.category),
            text: item.pulseText,
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
          <strong>Verified league data.</strong>{' '}
          {factData.currentSeasonHasResults
            ? 'Current-season published Matchday results are included.'
            : 'The 2026–27 season has no published Matchday results yet, so the desk is showing verified historical league facts. Current-season facts will appear automatically after results are published.'}
        </div>
      </div>

      <div className={styles.controls}>
        <span className={styles.filterLabel}>Season</span>
        <div className={styles.scopeRow} aria-label="Fact season">
          {factData.scopes.map((scope) => (
            <button
              className={styles.filterButton}
              key={scope.id}
              type="button"
              onClick={() => {
                setScopeId(scope.id);
                setCategory('All');
              }}
              aria-pressed={scope.id === activeScope.id}
            >
              {scope.label}
            </button>
          ))}
        </div>

        <span className={styles.filterLabel}>Fact type</span>
        <nav className={styles.categoryRow} aria-label="Clash Pulse fact categories">
          <button
            className={styles.filterButton}
            type="button"
            onClick={() => setCategory('All')}
            aria-pressed={category === 'All'}
          >
            Top facts
          </button>
          {categories
            .filter((item) => (categoryCounts.get(item) ?? 0) > 0)
            .map((item) => (
              <button
                className={styles.filterButton}
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                aria-pressed={category === item}
              >
                {item} {categoryCounts.get(item)}
              </button>
            ))}
        </nav>
      </div>

      <div className={styles.workspace}>
        <section className={styles.factPanel}>
          <header className={styles.factHeader}>
            <div>
              <h3>{category === 'All' ? 'Top facts' : category}</h3>
            </div>
            <span>{activeScope.label} · {activeScope.description}</span>
          </header>

          <div className={styles.factList}>
            {visible.map((item) => {
              const isSelected = selected.includes(item.id);
              return (
                <button
                  className={styles.factCard}
                  type="button"
                  key={item.id}
                  onClick={() => toggleSelected(item.id)}
                  aria-pressed={isSelected}
                >
                  <span className={styles.check} aria-hidden="true">{isSelected ? '✓' : '✓'}</span>
                  <span className={styles.factBody}>
                    <span className={styles.factMeta}>
                      {item.category}
                      <span className={styles.factValue}>{item.value}</span>
                    </span>
                    <strong className={styles.factHeadline}>{item.headline}</strong>
                    <span className={styles.factDetail}>{item.detail}</span>
                  </span>
                </button>
              );
            })}
            {visible.length === 0 ? (
              <p className={styles.queueEmpty}>No verified facts are available for this filter yet.</p>
            ) : null}
          </div>
        </section>

        <PulseQueue
          className={styles.queue}
          selectedItems={selectedItems}
          onRemove={toggleSelected}
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
                onRemove={toggleSelected}
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
  selectedItems: ClashPulseFactCandidate[];
  onRemove: (id: string) => void;
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
        <p className={styles.queueEmpty}>Tap a real league fact to collect it here. Selections stay in the queue while you change filters.</p>
      ) : (
        <div className={styles.queueItems}>
          {selectedItems.map((item) => (
            <div className={styles.queueItem} key={item.id}>
              <div>
                <strong>{item.headline}</strong>
                <small>{item.category} · {item.value}</small>
              </div>
              <button
                className={styles.removeButton}
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={`Remove ${item.headline} from Pulse Queue`}
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

function publicCategory(category: ClashPulseFactCategory): string {
  if (category === 'Upsets') return 'Upset';
  if (category === 'CI Gaps' || category === 'Above Expected' || category === 'CI +/-') return 'Clash Index';
  if (category === 'Doubles') return 'Doubles';
  return 'Record';
}
