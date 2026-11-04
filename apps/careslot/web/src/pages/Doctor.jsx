import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { api } from '../api.js';
import { useApi } from '../useApi.js';
import { DAYS, dayLabel, slotLabel } from '../time.js';
import { ErrorNote, Loading } from '../components/Status.jsx';

export default function Doctor() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const doc = useApi(`/doctors/${slug}`);
  const [avail, setAvail] = useState(null);
  const [availErr, setAvailErr] = useState(null);
  const [slot, setSlot] = useState(null);
  const [form, setForm] = useState({ patient_name: '', email: '', reason: '', visit_type: 'in-person' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const loadAvail = () => api(`/doctors/${slug}/availability?days=7`).then(setAvail).catch(setAvailErr);
  useEffect(() => { loadAvail(); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  if (doc.loading) return <div className="wrap"><Loading /></div>;
  if (doc.error) return <div className="wrap"><ErrorNote error={doc.error} /></div>;
  const d = doc.data;

  async function book(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api('/appointments', { method: 'POST', body: { ...form, doctor: slug, starts_at: slot } });
      navigate(`/appointments/${r.code}?email=${encodeURIComponent(r.email)}&new=1`);
    } catch (err) {
      setError(err);
      if (err.status === 409) { setSlot(null); loadAvail(); }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap">
      <Link to="/doctors" className="back">← All doctors</Link>
      <div className="profile">
        <div className="profile__photo" style={{ backgroundImage: `url(${d.photo})` }} />
        <div>
          <p className="eyebrow eyebrow--dark">{d.specialty_name}</p>
          <h1 className="h1">{d.full_name}</h1>
          <p className="muted">{d.credentials} · {d.years} years in practice · {d.clinic}</p>
          <p className="lede">{d.bio}</p>
          <ul className="facts">
            <li><span>Rating</span>★ {d.rating.toFixed(1)} ({d.review_count})</li>
            <li><span>Languages</span>{d.languages.join(', ')}</li>
            <li><span>Hours</span>{d.weekdays.map((w) => DAYS[w]).join(', ')} · {d.start_hour}:00–{d.end_hour}:00</li>
            <li><span>Visit length</span>{d.slot_minutes} minutes</li>
          </ul>
        </div>
      </div>

      <section className="booking">
        <div>
          <h2 className="h2">Pick a time <span className="muted small">(clinic time, {d.timezone.replace('_', ' ')})</span></h2>
          {availErr && <ErrorNote error={availErr} />}
          {!avail && !availErr && <Loading label="Loading the calendar" />}
          <div className="week">
            {avail?.days.map(({ day, slots }) => {
              const l = dayLabel(day);
              return (
                <div key={day} className="week__day">
                  <div className="week__head"><strong>{l.weekday}</strong><span>{l.date}</span></div>
                  {slots.map((s) => (
                    <button key={s.starts_at} disabled={s.taken} className={`slot ${slot === s.starts_at ? 'is-on' : ''}`} onClick={() => setSlot(s.starts_at)}>
                      {s.time}
                    </button>
                  ))}
                </div>
              );
            })}
            {avail && avail.days.length === 0 && <p className="muted">No openings this week.</p>}
          </div>
        </div>

        <form className="book" onSubmit={book}>
          <h3>{slot ? slotLabel(slot) : 'Choose a slot to continue'}</h3>
          <div className="seg">
            {['in-person', 'video'].map((v) => (
              <button type="button" key={v} className={form.visit_type === v ? 'is-on' : ''} onClick={() => setForm({ ...form, visit_type: v })}>{v === 'video' ? 'Video visit' : 'In person'}</button>
            ))}
          </div>
          <input className="input" required placeholder="Patient name" value={form.patient_name} onChange={(e) => setForm({ ...form, patient_name: e.target.value })} />
          <input className="input" required type="email" placeholder="Email for reminders" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <textarea className="input" rows={3} placeholder="Reason for visit (optional)" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          {error && <ErrorNote error={error} />}
          <button className="btn btn--solid btn--block" disabled={!slot || busy}>{busy ? 'Booking…' : 'Confirm appointment'}</button>
          <p className="muted small">Demo only — no medical data is stored beyond this lab.</p>
        </form>
      </section>
    </div>
  );
}
