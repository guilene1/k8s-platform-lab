import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api, money } from '../api.js';
import { ErrorNote, Loading } from '../components/Status.jsx';

function Tracker({ code }) {
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    const load = () => api(`/orders/${code}`).then((o) => live && setOrder(o)).catch((e) => live && setError(e));
    load();
    const t = setInterval(load, 15000); // the status advances in real time
    return () => { live = false; clearInterval(t); };
  }, [code]);

  if (error) return <ErrorNote error={error} />;
  if (!order) return <Loading label="Finding your food" />;
  const t = order.tracking;

  return (
    <div className="track">
      <div className="track__head" style={{ backgroundImage: `url(${order.restaurant_image})` }}>
        <div className="track__shade" />
        <div className="track__headtext">
          <span className="tag">Order {order.code}</span>
          <h1>{t.status === 'delivered' ? 'Delivered. Enjoy!' : `${t.minutes_left} min to go`}</h1>
          <p>{order.restaurant_name} → {order.address}</p>
        </div>
      </div>
      <div className="progress"><span style={{ width: `${t.progress * 100}%` }} /></div>
      <ol className="stages">
        {t.stages.map((s) => <li key={s.key} className={s.done ? 'is-done' : ''}>{s.label}</li>)}
      </ol>
      <p className="courier">🛵 <strong>{order.courier}</strong> is your courier{order.notes ? ` · “${order.notes}”` : ''}</p>
      <div className="receipt-card receipt-card--flat">
        {order.items.map((i) => (
          <div key={i.menu_item_id} className="rline"><span>{i.qty}×</span><span className="rline__name">{i.name}</span><span>{money(i.qty * i.price_cents)}</span></div>
        ))}
        <div className="rline rline--total"><span>Total paid</span><span>{money(order.total_cents)}</span></div>
      </div>
    </div>
  );
}

export default function Track() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  return (
    <div className="wrap narrow">
      {code ? <Tracker code={code} /> : (
        <>
          <p className="tag tag--dark">Track an order</p>
          <h1 className="big">Where's my food?</h1>
          <form className="track-form" onSubmit={(e) => { e.preventDefault(); navigate(`/track/${input.trim().toUpperCase()}`); }}>
            <input className="input" required placeholder="Order code, e.g. QP-7F3K2" value={input} onChange={(e) => setInput(e.target.value)} />
            <button className="btn btn--solid">Track</button>
          </form>
          <p className="muted">Try the sample order <Link className="link" to="/track/QP-7F3K2">QP-7F3K2</Link>.</p>
        </>
      )}
    </div>
  );
}
