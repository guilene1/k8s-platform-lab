import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { money } from '../api.js';
import { useApi } from '../useApi.js';
import { when } from '../when.js';
import { ErrorNote, Loading } from '../components/Status.jsx';

// A deterministic pixel pattern from the ticket code - looks like a scan code.
function Code({ value }) {
  let h = 2166136261;
  for (const c of value) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const cells = [];
  for (let i = 0; i < 81; i++) {
    h = Math.imul(h ^ (h >>> 13), 0x5bd1e995);
    if ((h >>> 0) % 2) cells.push(<rect key={i} x={(i % 9) * 10} y={Math.floor(i / 9) * 10} width="10" height="10" />);
  }
  return <svg className="scan" viewBox="0 0 90 90" aria-label={`Ticket code ${value}`}>{cells}</svg>;
}

function Order({ code, email, isNew }) {
  const { data: o, error, loading } = useApi(`/orders/${code}?email=${encodeURIComponent(email)}`);
  if (loading) return <Loading label="Printing tickets" />;
  if (error) return <ErrorNote error={error} />;
  const w = when(o.starts_at, o.timezone);
  return (
    <>
      {isNew && <p className="banner">You're going! {o.tickets.length} ticket{o.tickets.length > 1 ? 's' : ''} sent to {o.email}.</p>}
      <div className="stubs">
        {o.tickets.map((t) => (
          <article key={t.code} className="stub">
            <div className="stub__img" style={{ backgroundImage: `url(${o.image})` }} />
            <div className="stub__main">
              <span className="mono-tag">{w.full}</span>
              <h2>{o.artist}</h2>
              <p>{o.venue_name}, {o.city}</p>
              <div className="stub__seat">
                <div><span>Row</span><strong>{t.seat_row}</strong></div>
                <div><span>Seat</span><strong>{t.seat_number}</strong></div>
                <div><span>Price</span><strong className="mono">{money(t.price_cents)}</strong></div>
              </div>
            </div>
            <div className="stub__code"><Code value={t.code} /><span className="mono">{t.code}</span></div>
          </article>
        ))}
      </div>
      <p className="muted">Order {o.code} · {o.buyer_name} · total {money(o.total_cents)} incl. {money(o.fees_cents)} fees · <Link className="link" to={`/events/${o.slug}`}>Event page →</Link></p>
    </>
  );
}

export default function Tickets() {
  const { code } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [f, setF] = useState({ code: '', email: '' });
  return (
    <div className="wrap narrow">
      <h1 className="mega mega--sm">My tickets</h1>
      {code ? <Order code={code} email={params.get('email') || ''} isNew={params.get('new') === '1'} /> : (
        <>
          <form className="lookup" onSubmit={(e) => { e.preventDefault(); navigate(`/tickets/${f.code.trim().toUpperCase()}?email=${encodeURIComponent(f.email.trim())}`); }}>
            <input className="input" required placeholder="Order code (TW-8K2P4)" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} />
            <input className="input" required type="email" placeholder="Email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            <button className="btn btn--solid">Find tickets</button>
          </form>
          <p className="muted">Try <span className="mono">TW-8K2P4</span> with <span className="mono">dev.patel@example.com</span>.</p>
        </>
      )}
    </div>
  );
}
