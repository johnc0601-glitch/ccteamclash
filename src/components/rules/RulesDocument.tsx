'use client';

import {useMemo, useState, type ReactNode} from 'react';
import {charterDraftNotes, charterSections, finalsMatchFormats} from '@/data/rules/charter';
import styles from './RulesDocument.module.css';

function Highlight({value, query}: {value: string; query: string}) {
  if (!query) return <>{value}</>;
  const term = query.toLocaleLowerCase();
  const haystack = value.toLocaleLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;
  let index = haystack.indexOf(term, cursor);
  while (index >= 0) {
    if (index > cursor) parts.push(value.slice(cursor, index));
    parts.push(<mark key={index} className={styles.highlight}>{value.slice(index, index + query.length)}</mark>);
    cursor = index + query.length;
    index = haystack.indexOf(term, cursor);
  }
  if (cursor < value.length) parts.push(value.slice(cursor));
  return <>{parts}</>;
}

export function RulesDocument() {
  const [search, setSearch] = useState('');
  const query = search.trim().toLocaleLowerCase();
  const results = useMemo(() => charterSections.map((section) => {
    const titleMatch = section.title.toLocaleLowerCase().includes(query);
    const items = query && !titleMatch
      ? section.items.filter((item) => item.text.toLocaleLowerCase().includes(query))
      : section.items;
    const formats = section.id === 'finals-matchups'
      ? finalsMatchFormats.filter((row) => !query || titleMatch || `${row.players} players ${row.doubles} doubles ${row.singles} singles`.includes(query))
      : [];
    const notes = (charterDraftNotes[section.id] ?? []).filter((note) => !query || titleMatch || note.text.toLocaleLowerCase().includes(query) || note.status.toLocaleLowerCase().includes(query));
    return {section, items, formats, notes, titleMatch};
  }).filter(({items, formats, notes, titleMatch}) => !query || items.length > 0 || formats.length > 0 || notes.length > 0 || titleMatch), [query]);

  const matches = query ? results.reduce((total, result) => total
    + (result.titleMatch ? 1 : result.items.length + result.formats.length + result.notes.length), 0) : 0;

  return (
    <div className={styles.root}>
      <div className={styles.searchPanel} role="search" aria-label="Search league rules document">
        <label htmlFor="rules-document-search">Search this rules document</label>
        <div className={styles.searchRow}>
          <span aria-hidden="true" className={styles.searchIcon}>⌕</span>
          <input
            id="rules-document-search"
            type="search"
            autoComplete="off"
            placeholder="Search penalties, rosters, playoffs…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-describedby="rules-search-help rules-search-count"
          />
          {search ? <button type="button" onClick={() => setSearch('')}>Clear</button> : null}
        </div>
        <p id="rules-search-help" className={styles.searchHelp}>Searches only this charter. Matching sections and rule passages appear below.</p>
        <p id="rules-search-count" className={styles.matchCount} role="status" aria-live="polite">
          {query ? `${matches} matching ${matches === 1 ? 'passage' : 'passages'} in ${results.length} ${results.length === 1 ? 'section' : 'sections'}` : `${charterSections.length} sections · Full charter`}
        </p>
      </div>

      {!query ? (
        <nav className={styles.sectionsNav} aria-label="Rules sections">
          {charterSections.map((section) => <a key={section.id} href={`#rule-${section.id}`}>{section.title}</a>)}
        </nav>
      ) : null}

      <div className={styles.document}>
        {results.length === 0 ? (
          <div className={styles.noResults}>
            <h2>No matching rules found</h2>
            <p>Try another word or a shorter phrase. This search does not include other website pages.</p>
            <button type="button" onClick={() => setSearch('')}>Show all rules</button>
          </div>
        ) : results.map(({section, items, formats, notes}) => (
          <section className={styles.section} id={`rule-${section.id}`} key={section.id} aria-labelledby={`heading-${section.id}`}>
            <div className={styles.sectionHeader}>
              <h2 id={`heading-${section.id}`}><Highlight value={section.title} query={query}/></h2>
              <span className={styles.sectionCount}>{items.length} {items.length === 1 ? 'item' : 'items'}</span>
            </div>
            <div className={styles.entries}>
              {notes.length > 0 ? (
                <div className={styles.draftNotes}>
                  <h3>2026–27 roster and scoring review</h3>
                  {notes.map((note, noteIndex) => (
                    <div key={noteIndex} className={styles.draftNote}>
                      <strong className={styles.draftStatus}><Highlight value={note.status} query={query} /></strong>
                      <p><Highlight value={note.text} query={query} /></p>
                    </div>
                  ))}
                </div>
              ) : null}
              {notes.length > 0 && items.length > 0 ? <h3 className={styles.sourceHeading}>2025–26 charter wording (source reference, with agreed roster-lock updates)</h3> : null}
              {items.map((item, index) => (
                <div key={`${section.id}-${index}`} className={`${styles.entry} ${styles[`level${Math.min(item.level, 3)}`]}`}>
                  <span className={styles.bullet} aria-hidden="true">•</span>
                  <p><Highlight value={item.text} query={query}/>
                    {item.updated ? <span className={styles.updated}>2026–27 roster-lock revision</span> : null}
                  </p>
                </div>
              ))}
              {section.id === 'finals-matchups' && formats.length > 0 ? (
                <div className={styles.formatTableWrap}>
                  <h3>Finals matchup formats</h3>
                  <table className={styles.formatTable}>
                    <thead><tr><th>Players</th><th>Doubles matches</th><th>Singles matches</th></tr></thead>
                    <tbody>{formats.map((row) => <tr key={row.players}><td>{row.players}</td><td>{row.doubles}</td><td>{row.singles}</td></tr>)}</tbody>
                  </table>
                </div>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
