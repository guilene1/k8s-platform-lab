export function Loading({ label = 'Loading' }) {
  return <div className="status"><span className="status__dot" />{label}…</div>;
}

export function ErrorNote({ error, onRetry }) {
  return (
    <div className="status status--error" role="alert">
      <strong>Something went wrong.</strong>
      <span>{error?.message || String(error)}</span>
      {onRetry && <button className="btn btn--ghost-dark" onClick={onRetry}>Try again</button>}
    </div>
  );
}
