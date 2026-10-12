import Link from 'next/link';
import {setRoundCloseoutCheck} from '@/app/office/roundCloseoutActions';
import {canCloseRound, CLOSEOUT_CHECKS, type RoundCloseout} from '@/services/commissioner/RoundCloseoutService';

function dateLabel(value: string) {
  return new Intl.DateTimeFormat('en-US', {month: 'short', day: 'numeric', timeZone: 'UTC'}).format(new Date(`${value}T12:00:00Z`));
}

export function RoundCloseoutBoard({rounds, selected, notice, error}: {
  rounds: RoundCloseout[];
  selected: RoundCloseout | null;
  notice?: string;
  error?: string;
}) {
  return (
    <section className="office-closeout" aria-labelledby="office-closeout-title">
      <header className="office-closeout-header">
        <div>
          <span className="office-closeout-kicker">Post-round operations</span>
          <h2 id="office-closeout-title">Round checklist</h2>
          <p>Verify published data, then confirm the remaining administrative steps. Each round saves its own progress.</p>
        </div>
        <Link className="office-closeout-action" href="/office/clash-pulse">Clash Pulse →</Link>
      </header>
      {rounds.length ? (
        <nav className="office-closeout-rounds" aria-label="Choose round checklist">
          {rounds.map((round) => (
            <Link key={round.id}
              href={`/office?round=${encodeURIComponent(round.id)}`}
              className={selected?.id === round.id ? 'office-closeout-round selected' : 'office-closeout-round'}
              aria-current={selected?.id === round.id ? 'page' : undefined}>
              <strong>Round {round.number}</strong>
              <span>{round.started ? `${round.done}/${round.total} done` : dateLabel(round.firstMatchDate)}</span>
            </Link>
          ))}
        </nav>
      ) : null}
      {notice ? <p className="office-closeout-notice" role="status">{notice}</p> : null}
      {error ? <p className="office-closeout-error" role="alert">{error}</p> : null}
      {!selected ? (
        <p className="office-closeout-empty">No published season rounds are available yet.</p>
      ) : (
        <div className="office-closeout-body">
          <div className="office-closeout-summary">
            <div>
              <span>Round {selected.number} · {dateLabel(selected.firstMatchDate)}–{dateLabel(selected.lastMatchDate)}</span>
              <h3>{selected.started ? selected.ended ? 'Post-round review' : 'Round in progress' : 'Upcoming round'}</h3>
              <p>{selected.started
                ? selected.ended
                  ? 'The playing window has ended. Finish every review before signing off.'
                  : 'Matches are still scheduled in this round. You can review completed matches now; final sign-off remains locked.'
                : 'The checklist opens when the first scheduled match date arrives.'}</p>
            </div>
            <div className="office-closeout-progress">
              <strong>{selected.done}<small> / {selected.total}</small></strong>
              <progress value={selected.done} max={selected.total} aria-label="Round checklist progress" />
              <span>{selected.done === selected.total ? 'All steps complete' : 'Steps complete'}</span>
            </div>
          </div>
          <div className="office-closeout-checks">
            <div className="office-closeout-item">
              <span className={selected.matchCount > 0 && selected.resultsPublished === selected.matchCount ? 'office-closeout-status verified' : 'office-closeout-status pending'}>
                {selected.matchCount > 0 && selected.resultsPublished === selected.matchCount ? '✓' : '○'}
              </span>
              <div>
                <strong>Publish official results</strong>
                <p>{selected.resultsPublished} of {selected.matchCount} scheduled matches have published final scores. Verified automatically from match results.</p>
              </div>
              <Link href="/office/results">Results ↗</Link>
            </div>
            <div className="office-closeout-item">
              <span className={selected.matchCount > 0 && selected.ciPublished === selected.matchCount ? 'office-closeout-status verified' : 'office-closeout-status pending'}>
                {selected.matchCount > 0 && selected.ciPublished === selected.matchCount ? '✓' : '○'}
              </span>
              <div>
                <strong>Confirm CI publication</strong>
                <p>{selected.ciPublished} of {selected.matchCount} matches have been applied to CI. Verified automatically from the publication ledger.</p>
              </div>
              <Link href="/office/players">Players ↗</Link>
            </div>
            {CLOSEOUT_CHECKS.map((task) => {
              const checked = selected.checks[task.key];
              const lockClose = task.key === 'closed' && !checked && !canCloseRound(selected);
              const disabled = !selected.started || lockClose;
              return (
                <div className="office-closeout-item" key={task.key}>
                  <span className={checked ? 'office-closeout-status confirmed' : 'office-closeout-status pending'} aria-hidden="true">{checked ? '✓' : '○'}</span>
                  <div>
                    <strong>{task.title}</strong>
                    <p>{task.detail}</p>
                    {lockClose && !selected.checks.closed ? <small>Unlocks after the last match and all earlier items are complete.</small> : null}
                  </div>
                  <div className="office-closeout-item-actions">
                    {task.key !== 'closed' ? <Link href={task.href}>Open ↗</Link> : null}
                    <form action={setRoundCloseoutCheck}>
                      <input type="hidden" name="roundId" value={selected.id} />
                      <input type="hidden" name="key" value={task.key} />
                      <input type="hidden" name="checked" value={checked ? 'false' : 'true'} />
                      <button type="submit" disabled={disabled} aria-label={`${checked ? 'Undo' : 'Mark done'}: ${task.title}`}>
                        {checked ? 'Undo' : 'Mark done'}
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="office-closeout-footnote">Verified checks are read-only. The other items require explicit commissioner confirmation, even when the corresponding page has been updated.</p>
        </div>
      )}
    </section>
  );
}
