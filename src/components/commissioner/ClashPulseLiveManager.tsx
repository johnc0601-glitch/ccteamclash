'use client';

import {FormEvent, useCallback, useEffect, useState} from 'react';
import styles from './ClashPulseLiveManager.module.css';

type LiveItem = {
  id: string;
  category: string;
  text: string;
  publishedAt: string;
};

const categories = [
  'Streak',
  'Upset',
  'Clash Index',
  'Ranking',
  'Milestone',
  'History',
  'Series',
  'Doubles',
  'Record',
  'League',
];

export function ClashPulseLiveManager() {
  const [items, setItems] = useState<LiveItem[]>([]);
  const [category, setCategory] = useState('League');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/clash-pulse', {cache: 'no-store'});
      const payload = await response.json() as {items?: LiveItem[]; error?: string};
      if (!response.ok) throw new Error(payload.error || 'Could not load Clash Pulse.');
      setItems(payload.items ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load Clash Pulse.');
    }
  }, []);

  useEffect(() => {
    void load();
    const handleUpdate = () => void load();
    window.addEventListener('clash-pulse-updated', handleUpdate);
    return () => window.removeEventListener('clash-pulse-updated', handleUpdate);
  }, [load]);

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim() || busy) return;

    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/clash-pulse', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({category, text}),
      });
      const payload = await response.json() as {item?: LiveItem; error?: string};
      if (!response.ok) throw new Error(payload.error || 'Could not publish Clash Pulse fact.');

      if (payload.item) setItems((current) => [payload.item!, ...current]);
      setText('');
      setMessage('Published to the homepage Clash Pulse.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not publish Clash Pulse fact.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/clash-pulse', {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({id}),
      });
      const payload = await response.json() as {error?: string};
      if (!response.ok) throw new Error(payload.error || 'Could not remove Clash Pulse fact.');
      setItems((current) => current.filter((item) => item.id !== id));
      setMessage('Removed from the homepage Clash Pulse.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not remove Clash Pulse fact.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={styles.manager}>
      <div className={styles.heading}>
        <div>
          <span>Homepage feed</span>
          <h3>Live Clash Pulse</h3>
          <p>Publish a verified fact directly to the homepage. These are the only facts the public Pulse bar will show.</p>
        </div>
        <strong>{items.length} live</strong>
      </div>

      <form className={styles.form} onSubmit={publish}>
        <label>
          <span>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>

        <label className={styles.factField}>
          <span>Fact</span>
          <textarea
            rows={3}
            maxLength={240}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Example: Ninjas have won seven straight singles matches."
          />
          <small>{text.length}/240</small>
        </label>

        <button type="submit" disabled={busy || !text.trim()}>
          {busy ? 'Publishing…' : 'Publish to Clash Pulse'}
        </button>
      </form>

      {message ? <div className={styles.message}>{message}</div> : null}

      <div className={styles.liveList}>
        {items.length === 0 ? (
          <p className={styles.empty}>No live Clash Pulse facts yet. The homepage bar stays hidden until you publish one.</p>
        ) : items.map((item) => (
          <article className={styles.liveItem} key={item.id}>
            <div>
              <span>{item.category}</span>
              <strong>{item.text}</strong>
              <small>{new Date(item.publishedAt).toLocaleString()}</small>
            </div>
            <button type="button" disabled={busy} onClick={() => remove(item.id)}>Remove</button>
          </article>
        ))}
      </div>
    </section>
  );
}
