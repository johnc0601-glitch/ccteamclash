'use client';

export function RouteError({
  backHref,
  backLabel,
  message,
  title,
  unstableRetry,
}: {
  backHref: string;
  backLabel: string;
  message: string;
  title: string;
  unstableRetry: () => void;
}) {
  return (
    <main className="route-state-page">
      <section className="route-state-card" role="alert">
        <span>Unable to load</span>
        <h1>{title}</h1>
        <p>{message}</p>
        <div className="route-state-actions">
          <button onClick={unstableRetry} type="button">Try again</button>
          <a href={backHref}>{backLabel}</a>
        </div>
      </section>
    </main>
  );
}
