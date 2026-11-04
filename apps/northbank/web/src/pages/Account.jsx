import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useApi } from '../useApi.js';
import { ErrorNote, Loading } from '../components/Status.jsx';
import { TYPE_LABEL, day, signed, usd } from '../format.js';

export default function Account() {
  const { number } = useParams();
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const acct = useApi(`/accounts/${number}`);
  const params = new URLSearchParams({ limit: '60' });
  if (category) params.set('category', category);
  if (query) params.set('q', query);
  const txs = useApi(`/accounts/${number}/transactions?${params}`);

  if (acct.loading) return <div className="shell"><Loading /></div>;
  if (acct.error) return <div className="shell"><ErrorNote error={acct.error} /></div>;
  const a = acct.data;

  return (
    <div className="shell">
      <p className="crumbs"><Link to="/app">Overview</Link> / {a.nickname}</p>
      <header className="page-head">
        <div>
          <p className="kicker kicker--dark">{TYPE_LABEL[a.type]} · <span className="mono">{a.masked}</span></p>
          <h1 className="display">{a.nickname}</h1>
        </div>
        <div className="page-head__month">
          <div><span className="muted">{a.type === 'credit' ? 'Balance owed' : 'Available'}</span><span className="mono big">{usd(a.type === 'credit' ? -a.balance_cents : a.available_cents)}</span></div>
          <div><span className="muted">In · this month</span><span className="mono pos">{signed(a.month.in_cents)}</span></div>
          <div><span className="muted">Out · this month</span><span className="mono neg">{signed(-a.month.out_cents)}</span></div>
        </div>
      </header>

      <div className="filters">
        <div className="chips">
          <button className={`chip ${!category ? 'is-on' : ''}`} onClick={() => setCategory('')}>All</button>
          {a.categories.map((c) => (
            <button key={c} className={`chip ${c === category ? 'is-on' : ''}`} onClick={() => setCategory(c)}>{c}</button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); setQuery(q.trim()); }}>
          <input className="input input--sm" placeholder="Search transactions" value={q} onChange={(e) => setQ(e.target.value)} />
        </form>
      </div>

      <div className="panel panel--flush">
        {txs.loading && <Loading label="Loading transactions" />}
        {txs.error && <ErrorNote error={txs.error} />}
        {txs.data && txs.data.length === 0 && <p className="muted pad">No transactions match.</p>}
        {txs.data && txs.data.length > 0 && (
          <table className="table">
            <thead>
              <tr><th>Date</th><th>Description</th><th className="hide-sm">Category</th><th className="num">Amount</th><th className="num hide-sm">Balance</th></tr>
            </thead>
            <tbody>
              {txs.data.map((t) => (
                <tr key={t.reference}>
                  <td className="mono">{day(t.posted_at)}</td>
                  <td>{t.description}</td>
                  <td className="hide-sm"><span className="tag">{t.category}</span></td>
                  <td className={`num mono ${t.amount_cents < 0 ? 'neg' : 'pos'}`}>{signed(t.amount_cents)}</td>
                  <td className="num mono muted hide-sm">{usd(t.balance_after_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
