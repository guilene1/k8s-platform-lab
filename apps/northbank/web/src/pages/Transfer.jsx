import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { api } from '../api.js';
import { useApi } from '../useApi.js';
import { ErrorNote, Loading } from '../components/Status.jsx';
import { usd } from '../format.js';

export default function Transfer() {
  const overview = useApi('/overview');
  const payees = useApi('/payees');
  const [form, setForm] = useState({ from: '', to: '', amount: '', memo: '' });
  const [step, setStep] = useState('edit');
  const [error, setError] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [busy, setBusy] = useState(false);

  const accounts = overview.data?.accounts || [];
  useEffect(() => {
    if (accounts.length && !form.from) {
      setForm((f) => ({ ...f, from: accounts.find((a) => a.type === 'checking')?.number || '', to: accounts.find((a) => a.type === 'savings')?.number || '' }));
    }
  }, [accounts, form.from]);

  if (overview.loading || payees.loading) return <div className="shell"><Loading /></div>;
  if (overview.error) return <div className="shell"><ErrorNote error={overview.error} /></div>;

  const from = accounts.find((a) => a.number === form.from);
  const toAccount = accounts.find((a) => a.number === form.to);
  const toPayee = payees.data?.find((p) => `payee:${p.id}` === form.to);
  const cents = Math.round(Number(form.amount) * 100);
  const valid = from && (toAccount || toPayee) && cents > 0 && form.from !== form.to;

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const body = { from_account: form.from, amount_cents: cents, memo: form.memo };
      if (toPayee) body.payee_id = toPayee.id; else body.to_account = form.to;
      setReceipt(await api('/transfers', { method: 'POST', body }));
      setStep('done');
    } catch (e) {
      setError(e);
      setStep('edit');
    } finally {
      setBusy(false);
    }
  }

  if (step === 'done') {
    return (
      <div className="shell shell--narrow">
        <div className="receipt">
          <span className="receipt__tick">✓</span>
          <p className="kicker kicker--dark">Transfer sent</p>
          <h1 className="display mono-display">{usd(receipt.amount_cents)}</h1>
          <p>{receipt.from} → {receipt.to}</p>
          <p className="muted mono">Reference {receipt.reference}</p>
          <div className="receipt__actions">
            <Link to="/app" className="btn btn--solid">Back to overview</Link>
            <button className="btn btn--outline" onClick={() => { setStep('edit'); setForm({ ...form, amount: '', memo: '' }); }}>New transfer</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="shell shell--narrow">
      <p className="kicker kicker--dark">Move money</p>
      <h1 className="display">Where should it go?</h1>

      <div className="panel form">
        <label className="field">
          <span>From</span>
          <select className="input" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} disabled={step === 'review'}>
            {accounts.filter((a) => a.type !== 'credit').map((a) => (
              <option key={a.number} value={a.number}>{a.nickname} ({a.masked}) — {usd(a.balance_cents)}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>To</span>
          <select className="input" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} disabled={step === 'review'}>
            <optgroup label="Your accounts">
              {accounts.filter((a) => a.number !== form.from).map((a) => (
                <option key={a.number} value={a.number}>{a.nickname} ({a.masked})</option>
              ))}
            </optgroup>
            <optgroup label="Payees">
              {payees.data?.map((p) => <option key={p.id} value={`payee:${p.id}`}>{p.name} · {p.bank} ({p.masked})</option>)}
            </optgroup>
          </select>
        </label>
        <label className="field">
          <span>Amount</span>
          <div className="amount">
            <span>$</span>
            <input className="input mono" inputMode="decimal" placeholder="0.00" value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^0-9.]/g, '') })} disabled={step === 'review'} />
          </div>
          {from && <small className="muted">Available: {usd(from.balance_cents)}</small>}
        </label>
        <label className="field">
          <span>Memo (optional)</span>
          <input className="input" maxLength={80} placeholder="e.g. Rent, Dinner" value={form.memo}
            onChange={(e) => setForm({ ...form, memo: e.target.value })} disabled={step === 'review'} />
        </label>

        {error && <ErrorNote error={error} />}

        {step === 'edit' ? (
          <button className="btn btn--solid btn--block" disabled={!valid} onClick={() => setStep('review')}>Review transfer</button>
        ) : (
          <div className="review">
            <p>Send <strong className="mono">{usd(cents)}</strong> from <strong>{from.nickname}</strong> to <strong>{toAccount?.nickname || toPayee?.name}</strong>?</p>
            <div className="review__actions">
              <button className="btn btn--outline" onClick={() => setStep('edit')} disabled={busy}>Edit</button>
              <button className="btn btn--solid" onClick={send} disabled={busy}>{busy ? 'Sending…' : 'Confirm & send'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
