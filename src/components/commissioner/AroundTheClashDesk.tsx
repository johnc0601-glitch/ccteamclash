'use client';

import {useMemo, useState} from 'react';
import styles from './AroundTheClashDesk.module.css';

type Scope = 'Current Round' | 'Match' | 'Season' | 'All-Time';
type Category = 'Upsets' | 'CI Gaps' | 'Above Expected' | 'Road' | 'Home' | 'Singles' | 'Doubles' | 'CI +/-' | 'Closest';

type PreviewStat = {
  id: string;
  headline: string;
  detail: string;
  value: string;
  category: Category;
};

const scopes: Scope[] = ['Current Round', 'Match', 'Season', 'All-Time'];
const categories: Category[] = ['Upsets', 'CI Gaps', 'Above Expected', 'Road', 'Home', 'Singles', 'Doubles', 'CI +/-', 'Closest'];

// Deliberately labeled fixtures: these exercise the commissioner workflow without
// presenting invented league results as real data. Replace with rated Matchday rows.
const fixtures: PreviewStat[] = [
  {id: 'upset-1', category: 'Upsets', headline: 'Lower-CI side wins', detail: 'Preview fixture · ranked by pre-match expectation', value: '18% win chance'},
  {id: 'upset-2', category: 'Upsets', headline: 'Road underdog takes the point', detail: 'Preview fixture · singles', value: '27% win chance'},
  {id: 'gap-1', category: 'CI Gaps', headline: 'Largest CI gap overcome', detail: 'Preview fixture · winning side entered lower', value: '−84 CI'},
  {id: 'expected-1', category: 'Above Expected', headline: 'Best result above expectation', detail: 'Preview fixture · result versus pre-match model', value: '+31 pts'},
  {id: 'road-1', category: 'Road', headline: 'Top road performance', detail: 'Preview fixture · away side', value: '+24 pts'},
  {id: 'home-1', category: 'Home', headline: 'Top home performance', detail: 'Preview fixture · home side', value: '+22 pts'},
  {id: 'singles-1', category: 'Singles', headline: 'Top singles result', detail: 'Preview fixture · rated head-to-head', value: '+28 pts'},
  {id: 'doubles-1', category: 'Doubles', headline: 'Top doubles result', detail: 'Preview fixture · team CI uses stronger-player weighting', value: '+25 pts'},
  {id: 'change-1', category: 'CI +/-', headline: 'Biggest CI gain', detail: 'Preview fixture · post-match movement', value: '+14 CI'},
  {id: 'close-1', category: 'Closest', headline: 'Closest rated matchup', detail: 'Preview fixture · nearly even expectation', value: '51–49'},
];

export function AroundTheClashDesk() {
  const [scope, setScope] = useState<Scope>('Current Round');
  const [category, setCategory] = useState<Category | 'All'>('All');
  const [selected, setSelected] = useState<string[]>([]);
  const [mobileQueueOpen, setMobileQueueOpen] = useState(false);

  const categoryCounts = useMemo(() => {
    const counts = new Map<Category, number>();
    for (const item of fixtures) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    return counts;
  }, []);

  const visible = useMemo(
    () => category === 'All' ? fixtures : fixtures.filter((item) => item.category === category),
    [category],
  );
  const selectedItems = fixtures.filter((item) => selected.includes(item.id));

  function toggleSelected(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function clearSelected() {
    setSelected([]);
    setMobileQueueOpen(false);
  }

  return (
    <div className={styles.desk}>
      <div className={styles.previewNote}>
        <div>
          <strong>Selection preview.</strong> The facts below are test fixtures only. This screen does not publish or write to the database yet.
        </div>
      </div>

      <div className={styles.controls}>
        <span className={styles.filterLabel}>Scope</span>
        <div className={styles.scopeRow} aria-label="Fact scope">
          {scopes.map((item) => (
            <button
              className={styles.filterButton}
              key={item}
              type="button"
              onClick={() => setScope(item)}
              aria-pressed={scope === item}
            >
              {item}
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
            All {fixtures.length}
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
            <span>{scope} · tap a fact to add it to the Pulse Queue</span>
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
          </div>
        </section>

        <PulseQueue
          className={styles.queue}
          selectedItems={selectedItems}
          onRemove={toggleSelected}
          onClear={clearSelected}
        />
      </div>

      <div className={styles.mobileQueue}>
        <div className={styles.mobileQueueSummary}>
          <strong>Pulse Queue · {selectedItems.length}</strong>
          <button
            className={styles.mobileQueueButton}
            type="button"
            onClick={() => setMobileQueueOpen((current) => !current)}
            disabled={selectedItems.length === 0}
            aria-expanded={mobileQueueOpen}
          >
            {mobileQueueOpen ? 'Hide queue' : 'View queue'}
          </button>
        </div>
        {mobileQueueOpen && selectedItems.length > 0 ? (
          <div className={styles.mobileQueuePanel}>
            <PulseQueue
              className={styles.mobileQueueContents}
              selectedItems={selectedItems}
              onRemove={toggleSelected}
              onClear={clearSelected}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PulseQueue({
  selectedItems,
  onRemove,
  onClear,
  className,
}: {
  selectedItems: PreviewStat[];
  onRemove: (id: string) => void;
  onClear: () => void;
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
        <p className={styles.queueEmpty}>Tap any interesting fact to collect it here. Your selections stay in the queue while you change filters.</p>
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

      <button className={styles.publishButton} type="button" disabled>
        Publish to Clash Pulse
      </button>
      <span className={styles.queueHint}>Publishing activates when live verified Clash Pulse facts are connected.</span>
    </aside>
  );
}
