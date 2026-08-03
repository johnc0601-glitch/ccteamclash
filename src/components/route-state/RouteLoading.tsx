export function RouteLoading({label}: {label: string}) {
  return (
    <main className="route-state-page" aria-busy="true" aria-live="polite">
      <section className="route-state-card route-state-loading">
        <span>Loading</span>
        <h1>{label}</h1>
        <div className="route-state-skeleton" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
      </section>
    </main>
  );
}
