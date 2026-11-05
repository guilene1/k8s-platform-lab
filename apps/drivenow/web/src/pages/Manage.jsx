import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { ErrorNote, Loading } from '../components/Status.jsx';

function PhotoRow({ v, onDone }) {
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  async function upload(e) {
    e.preventDefault();
    const form = new FormData();
    form.append('photo', file);
    setBusy(true);
    try {
      const r = await api(`/fleet/vehicles/${v.slug}/photo`, { method: 'POST', form });
      setMsg({ ok: true, text: `Saved to shared storage by ${r.served_by}` });
      setFile(null);
      e.target.reset();
      onDone();
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="mrow" onSubmit={upload}>
      <span className="mrow__img" style={{ backgroundImage: `url(${v.photo})` }} />
      <span className="mrow__name"><strong>{v.name}</strong><small>{v.photo_file}</small></span>
      <label className="pick">
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files[0] || null)} />
        <span>{file ? file.name : 'Choose new photo'}</span>
      </label>
      <button className="btn btn--outline" disabled={!file || busy}>{busy ? 'Uploading…' : 'Replace'}</button>
      {msg && <span className={msg.ok ? 'ok ok--inline' : 'warn'}>{msg.text}</span>}
    </form>
  );
}

// Demo fleet-manager screen: replace vehicle photos. The files go to the
// shared EFS volume, so every API replica serves the new photo immediately.
export default function Manage() {
  const [fleet, setFleet] = useState(null);
  const [error, setError] = useState(null);
  const load = () => api('/vehicles').then((d) => setFleet(d.vehicles)).catch(setError);
  useEffect(() => { load(); }, []);
  return (
    <div className="wrap">
      <p className="tag tag--dark">Fleet manager · demo</p>
      <h1 className="h1">Vehicle photos</h1>
      <p className="muted">Uploads are written to Amazon EFS (ReadWriteMany). Upload through one API pod, and every other pod serves the new image straight away.</p>
      {error && <ErrorNote error={error} />}
      {!fleet && !error && <Loading />}
      <div className="mlist">{fleet?.map((v) => <PhotoRow key={v.slug} v={v} onDone={load} />)}</div>
    </div>
  );
}
