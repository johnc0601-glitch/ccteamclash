'use client';

import {useMemo, useState} from 'react';
import styles from './AroundTheClashDesk.module.css';

type Category = 'All' | 'Upsets' | 'CI Gaps' | 'Above Expected' | 'Road' | 'Home' | 'Singles' | 'Doubles' | 'CI +/-' | 'Closest';

type PreviewStat = {
  id: string;
  headline: string;
  detail: string;
  value: string;
  category: Exclude<Category, 'All'>;
};

const categories: Category[] = ['All', 'Upsets', 'CI Gaps', 'Above Expected', 'Road', 'Home', 'Singles', 'Doubles', 'CI +/-', 'Closest'];

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
  const [category, setCategory] = useState<Category>('All');
  const [selected, setSelected] = useState<string[]>([]);
  const [queueOpen, setQueueOpen] = useState(false);

  const counts = useMemo(() => {
    const next = new Map<Category, number>();
    next.set('All', fixtures.length);
    for (const item of fixtures) {
      next.set(item.category, (next.get(item.category) ?? 0) + 1);
    }
    return next;
  }, []);

  const visible = useMemo(
    () => category === 'All' ? fixtures : fixtures.filter((item) => item.category === category),
    [category],
  );

  const selectedItems = useMemo(
    () => fixtures.filter((item) => selected.includes(item.id)),
    [selected],
  );

  function toggleSelected(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function clearSelection() {
    setSelected([]);
    setQueueOpen(false);
  }

  return (
    <div className={styles.desk}>
      <section className={styles.intro}>
        <strong>Clash Pulse fact selection</strong>
        <p>Tap any interesting fact to add it to the Pulse Queue. Selection stays with you while you move between categories.</p>
      </section>

      <div className={styles.toolbar}>
        <nav className={styles.filters} aria-label="Clash Pulse fact categories">
          {categories.filter((item) => (counts.get(item) ?? 0) > 0).map((item) => (
            <button
              className={styles.filter}
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
            >
              {item} {counts.get(item) ?? 0}
            </button>
          ))}
        </nav>
        <span className={styles.selectionCount}>{selectedItems.length} selected</span>
      </div>

      <div className={styles.workspace}>
        <section className={styles.factList} aria-label="Verified fact candidates">
          {visible.map((item) => {
            const isSelected = selected.includes(item.id);
            return (
              <button
                className={styles.factButton}
                type="button"
                key={item.id}
                aria-pressed={isSelected}
                onClick={() => toggleSelected(item.id)}
              >
                <span className={styles.factCard}>
                  <span className={styles.check} aria-hidden="true">{isSelected ? '✓' : '•'}</span>
                  <span className={styles.factBody}>
                    <span className={styles.factTopline}>
                      <span className={styles.category}>{item.category}</span>
                    </span>
                    <strong className={styles.headline}>{item.headline}</strong>
                    <span className={styles.detail}>{item.detail}</span>
                    <span className={styles.value}>{item.value}</span>
                  </span>
                </span>
              </button>
            );
          })}
          {visible.length === 0 ? <p className={styles.empty}>No facts in this category.</p> : null}
        </section>

        <aside className={styles.queue} aria-label="Pulse Queue">
          <QueueContents
            selectedItems={selectedItems}
            onRemove={toggleSelected}
            onClear={clearSelection}
          />
        </aside>
      </div>

      <div className={styles.mobileDock} aria-label="Pulse Queue summary">
        <strong>{selectedItems.length} selected</strong>
        <button type="button" onClick={() => setQueueOpen((open) => !open)}>
          {queueOpen ? 'Close queue' : 'View queue'}
        </button>
      </div>

      <aside className={styles.mobileDrawer} hidden={!queueOpen} aria-label="Pulse Queue">
        <QueueContents
          selectedItems={selectedItems}
          onRemove={toggleSelected}
          onClear={clearSelection}
        />
      </aside>
    </div>
  );
}

function QueueContents({
  selectedItems,
  onRemove,
  onClear,
}: {
  selectedItems: PreviewStat[];
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <>
      <div className={styles.queueHeader}>
        <strong>Pulse Queue · {selectedItems.length}</strong>
        {selectedItems.length ? <button className={styles.clear} type="button" onClick={onClear}>Clear</button> : null}
      </div>

      <p className={styles.queueHint}>
        Review the facts you want to send to Clash Pulse. Live publishing remains disabled while this page is using preview fixtures.
      </p>

      {selectedItems.length ? (
        <div className={styles.queueItems}>
          {selectedItems.map((item) => (
            <div className={styles.queueItem} key={item.id}>
              <span>
                <strong>{item.headline}</strong>
                <small>{item.category} · {item.value}</small>
              </span>
              <button
                className={styles.remove}
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={`Remove ${item.headline} from Pulse Queue`}
                title="Remove"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.previewNote}>Tap a fact card to add it here.</p>
      )}

      <button className={styles.publish} type="button" disabled>
        Publish to Clash Pulse
      </button>
      <p className={styles.previewNote}>Publishing will be enabled when verified live facts replace these clearly labeled preview fixtures.</p>

      <section className={styles.liveSection}>
        <strong>Live on Clash Pulse · 0</strong>
        <p>No public Clash Pulse facts are live yet.</p>
      </section>
    </>
  );
}
