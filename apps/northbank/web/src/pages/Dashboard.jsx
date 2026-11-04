import { Link } from 'react-router';
import { useApi } from '../useApi.js';
import { ErrorNote, Loading } from '../components/Status.jsx';
import { TYPE_LABEL, day, signed, usd } from '../format.js';

function Spending() {
  const { data, error } = useApi('/insights?days=30');
  if (error) return <ErrorNote error={error} />;
  if (!data) return <Loading label="Crunching numbers" />;
  const max = Math.max(...data.categories.map((c) => c.total_cents), 1);
  const total = data.categories.reduce((s, c) => s + c.total_cents, 0);
  return (
    <div className="panel">
      <div className="panel__head">
        <h3>Spending · last 30 days</h3>
        <span className="mono">{usd(total)}</span>
      </div>
      <ul className="bars">
        {data.categories.map((c) => (
          <li key={c.category}>
            <span className="bars__label">{c.category}</span>
            <span className="bars__track"><span className="bars__fill" style={{ width: `${(c.total_cents / max) * 100}%` }} /></span>
            <span className="bars__value mono">{usd(c.total_cents)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Dashboard() {
  const { data, error, loading } = useApi('/overview');
  if (loading) return <div className="shell"><Loading label="Loading your accounts" /></div>;
  if (error) return <div className="shell"><ErrorNote error={error} /></div>;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="shell">
      <header className="page-head">
        <div>
          <p className="kicker kicker--dark">{greeting}, {data.customer.name.split(' ')[0]}</p>
          <h1 className="display">Net worth <span className="mono big">{usd(data.net_worth_cents)}</span></h1>
        </div>
        <div className="page-head__month">
          <div><span className="muted">In this month</span><span className="mono pos">{signed(data.month.in_cents)}</span></div>
          <div><span className="muted">Card spend</span><span className="mono neg">{signed(-data.month.out_cents)}</span></div>
          <Link to="/app/transfer" className="btn btn--solid">Move money</Link>
        </div>
      </header>

      <div className="accounts">
        {data.accounts.map((a) => (
          <Link key={a.number} to={`/app/accounts/${a.number}`} className={`acct acct--${a.type}`}>
            <span className="acct__type">{TYPE_LABEL[a.type]}</span>
            <span className="acct__name">{a.nickname}</span>
            <span className="acct__bal mono">{usd(a.balance_cents)}</span>
            <span className="acct__meta">
              <span className="mono">{a.masked}</span>
              {a.type === 'savings' && <span>{(a.apy_bps / 100).toFixed(2)}% APY</span>}
              {a.type === 'credit' && <span>{usd(a.available_cents)} available</span>}
            </span>
          </Link>
        ))}
      </div>

      <div className="grid-2">
        <div className="panel">
          <div className="panel__head"><h3>Recent activity</h3></div>
          <ul className="txlist">
            {data.recent.map((t) => (
              <li key={t.reference}>
                <span className="txlist__date mono">{day(t.posted_at)}</span>
                <span className="txlist__desc">{t.description}<small>{t.account} · {t.category}</small></span>
                <span className={`mono ${t.amount_cents < 0 ? 'neg' : 'pos'}`}>{signed(t.amount_cents)}</span>
              </li>
            ))}
          </ul>
        </div>
        <Spending />
      </div>
    </div>
  );
}
