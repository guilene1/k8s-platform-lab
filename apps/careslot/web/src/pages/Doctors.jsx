import { useSearchParams } from 'react-router';
import { useApi } from '../useApi.js';
import DoctorCard from '../components/DoctorCard.jsx';
import { ErrorNote, Loading } from '../components/Status.jsx';

export default function Doctors() {
  const [params, setParams] = useSearchParams();
  const specialty = params.get('specialty') || '';
  const specialties = useApi('/specialties');
  const doctors = useApi(`/doctors${specialty ? `?specialty=${specialty}` : ''}`);
  const current = specialties.data?.find((s) => s.slug === specialty);
  return (
    <div className="wrap">
      <p className="eyebrow eyebrow--dark">Find a doctor</p>
      <h1 className="h1">{current ? current.name : 'All clinicians'}</h1>
      <div className="tabs">
        <button className={!specialty ? 'is-on' : ''} onClick={() => setParams({})}>All</button>
        {specialties.data?.map((s) => (
          <button key={s.slug} className={s.slug === specialty ? 'is-on' : ''} onClick={() => setParams({ specialty: s.slug })}>{s.name}</button>
        ))}
      </div>
      {doctors.loading && <Loading label="Checking calendars" />}
      {doctors.error && <ErrorNote error={doctors.error} />}
      <div className="docs">{doctors.data?.map((d) => <DoctorCard key={d.slug} d={d} />)}</div>
    </div>
  );
}
