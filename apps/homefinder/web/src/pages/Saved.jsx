import { Link } from 'react-router';
import { useApi } from '../useApi.js';
import { useSaved, visitorId } from '../saved.js';
import ListingCard from '../components/ListingCard.jsx';
import { ErrorNote, Loading } from '../components/Status.jsx';

export default function Saved() {
  const list = useApi(`/saved?visitor=${visitorId()}`);
  const { saved, toggle } = useSaved();
  const homes = (list.data || []).filter((l) => saved.has(l.slug) || !saved.size);
  return (
    <div className="wrap">
      <p className="label label--dark">Saved homes</p>
      <h1 className="h1">The shortlist</h1>
      {list.loading && <Loading />}
      {list.error && <ErrorNote error={list.error} />}
      {list.data && homes.length === 0 && <p className="muted">Nothing saved yet. Tap ♡ on any home to keep it here. <Link className="link" to="/">Browse homes →</Link></p>}
      <div className="lgrid">
        {homes.map((l) => <ListingCard key={l.slug} l={l} saved={saved.has(l.slug)} onToggle={toggle} />)}
      </div>
    </div>
  );
}
