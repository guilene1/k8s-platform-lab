import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { api, money } from '../api.js';
import { useSaved } from '../saved.js';
import { ErrorNote, Loading } from '../components/Status.jsx';

function Uploader({ slug, onDone }) {
  const [files, setFiles] = useState([]);
  const [caption, setCaption] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function send(e) {
    e.preventDefault();
    const form = new FormData();
    files.forEach((f) => form.append('photos', f));
    form.append('caption', caption);
    setBusy(true);
    setMsg(null);
    try {
      const r = await api(`/listings/${slug}/photos`, { method: 'POST', form });
      setMsg({ ok: true, text: `${r.uploaded} photo${r.uploaded > 1 ? 's' : ''} saved to shared storage by pod ${r.served_by}.` });
      setFiles([]);
      setCaption('');
      e.target.reset();
      onDone();
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="uploader" onSubmit={send}>
      <h3>Add photos</h3>
      <p className="muted small">JPEG, PNG or WebP, up to 10 MB each. Photos are stored on the shared EFS volume, so every replica of the API serves them.</p>
      <label className="drop">
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setFiles([...e.target.files].slice(0, 6))} />
        <span>{files.length ? `${files.length} file${files.length > 1 ? 's' : ''} selected` : 'Choose photos…'}</span>
      </label>
      <input className="input" placeholder="Caption (optional)" value={caption} onChange={(e) => setCaption(e.target.value)} />
      <button className="btn btn--solid btn--block" disabled={!files.length || busy}>{busy ? 'Uploading…' : 'Upload'}</button>
      {msg && <p className={msg.ok ? 'ok' : 'err'}>{msg.text}</p>}
    </form>
  );
}

export default function Listing() {
  const { slug } = useParams();
  const [l, setL] = useState(null);
  const [error, setError] = useState(null);
  const [active, setActive] = useState(0);
  const { saved, toggle } = useSaved();

  const load = () => api(`/listings/${slug}`).then(setL).catch(setError);
  useEffect(() => { load(); }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <div className="wrap"><ErrorNote error={error} /></div>;
  if (!l) return <div className="wrap"><Loading /></div>;
  const photo = l.photos[active] || l.photos[0];

  return (
    <div className="wrap">
      <Link to="/" className="back">← All homes</Link>
      <div className="gallery">
        <div className="gallery__main" style={{ backgroundImage: photo ? `url(${photo.url})` : undefined }}>
          {photo?.caption && <span className="gallery__cap">{photo.caption}</span>}
          {photo?.source === 'upload' && <span className="gallery__src">Uploaded via pod {photo.uploaded_by}</span>}
        </div>
        <div className="gallery__thumbs">
          {l.photos.map((p, i) => (
            <button key={p.id} className={`thumb ${i === active ? 'is-on' : ''}`} style={{ backgroundImage: `url(${p.url})` }} onClick={() => setActive(i)} aria-label={p.caption || `Photo ${i + 1}`} />
          ))}
        </div>
      </div>

      <div className="detail">
        <div>
          <p className="label label--dark">{l.property_type} · {l.neighborhood}, {l.city}{l.status === 'pending' ? ' · Under offer' : ''}</p>
          <h1 className="h1">{l.title}</h1>
          <p className="addr">{l.address}</p>
          <div className="facts">
            <div><strong>{money(l.price_cents)}</strong><span>Asking price</span></div>
            <div><strong>{l.beds}</strong><span>Bedrooms</span></div>
            <div><strong>{l.baths}</strong><span>Bathrooms</span></div>
            <div><strong>{l.sqft.toLocaleString()}</strong><span>Square feet</span></div>
            {l.year_built && <div><strong>{l.year_built}</strong><span>Built</span></div>}
          </div>
          <p className="desc">{l.description}</p>
          <ul className="feat">{l.features.map((x) => <li key={x}>{x}</li>)}</ul>
          <p className="muted">Listed by {l.agent_name} · {new Date(l.listed_at).toLocaleDateString()}</p>
        </div>
        <aside className="side">
          <button className={`btn btn--block ${saved.has(l.slug) ? 'btn--solid' : 'btn--outline'}`} onClick={() => toggle(l.slug)}>
            {saved.has(l.slug) ? '♥ Saved' : '♡ Save this home'}
          </button>
          <Uploader slug={l.slug} onDone={load} />
        </aside>
      </div>
    </div>
  );
}
