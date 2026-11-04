import { useState } from 'react';
import { useNavigate } from 'react-router';
import { api } from '../api.js';
import { ErrorNote } from '../components/Status.jsx';

const FIELDS = [
  ['title', 'Headline', 'Sunny bungalow with a big garden', 'wide'],
  ['address', 'Street address', '88 Willow Street', 'wide'],
  ['city', 'City', 'Portland'],
  ['neighborhood', 'Neighbourhood', 'Alberta Arts'],
  ['price', 'Asking price (USD)', '650000'],
  ['sqft', 'Size (sqft)', '1450'],
  ['beds', 'Bedrooms', '3'],
  ['baths', 'Bathrooms', '1.5'],
];

export default function Sell() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ property_type: 'house', description: '', features: '' });
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    const data = new FormData();
    Object.entries(form).forEach(([k, v]) => data.append(k, v));
    files.forEach((f) => data.append('photos', f));
    setBusy(true);
    setError(null);
    try {
      const r = await api('/listings', { method: 'POST', form: data });
      navigate(`/homes/${r.slug}`);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="wrap narrow">
      <p className="label label--dark">Sell with HomeFinder</p>
      <h1 className="h1">List your home</h1>
      <p className="muted">Your photos are uploaded to shared storage (Amazon EFS) — whichever API pod handles your request, every pod can serve them.</p>
      <form className="sell" onSubmit={submit}>
        {FIELDS.map(([k, label, ph, wide]) => (
          <label key={k} className={`field ${wide ? 'field--wide' : ''}`}><span>{label}</span>
            <input className="input" required placeholder={ph} value={form[k] || ''} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></label>
        ))}
        <label className="field"><span>Property type</span>
          <select className="input" value={form.property_type} onChange={(e) => setForm({ ...form, property_type: e.target.value })}>
            {['house', 'townhouse', 'condo', 'loft', 'cottage'].map((t) => <option key={t}>{t}</option>)}
          </select></label>
        <label className="field"><span>Features (comma separated)</span>
          <input className="input" placeholder="Garden, Fireplace, Garage" value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} /></label>
        <label className="field field--wide"><span>Description</span>
          <textarea className="input" required rows={5} placeholder="What makes it special?" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <label className="drop field--wide">
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple required onChange={(e) => setFiles([...e.target.files].slice(0, 6))} />
          <span>{files.length ? `${files.length} photo${files.length > 1 ? 's' : ''} ready to upload` : 'Add up to 6 photos (first one is the cover)'}</span>
        </label>
        {error && <div className="field--wide"><ErrorNote error={error} /></div>}
        <button className="btn btn--solid btn--block field--wide" disabled={busy}>{busy ? 'Uploading…' : 'Publish listing'}</button>
      </form>
    </div>
  );
}
