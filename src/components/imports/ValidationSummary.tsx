import styles from './ImportManagement.module.css';

type ValidationSummaryProps = {
  errors: string[];
  warnings: string[];
};

export function ValidationSummary({errors, warnings}: ValidationSummaryProps) {
  return (
    <section className={styles.validationSummary} aria-label="Validation summary">
      <div>
        <span>Errors</span>
        <strong>{errors.length}</strong>
      </div>
      <div>
        <span>Warnings</span>
        <strong>{warnings.length}</strong>
      </div>
      <div className={styles.validationMessages}>
        {errors.length ? (
          <>
            <span>Errors</span>
            <ul>
              {errors.map((error) => <li key={error}>{error}</li>)}
            </ul>
          </>
        ) : null}
        {warnings.length ? (
          <>
            <span>Warnings</span>
            <ul>
              {warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </>
        ) : null}
        {!errors.length && !warnings.length ? <p>No validation issues found.</p> : null}
      </div>
    </section>
  );
}

