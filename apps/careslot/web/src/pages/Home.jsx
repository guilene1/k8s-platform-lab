import { Link } from 'react-router';
import { useApi } from '../useApi.js';
import DoctorCard from '../components/DoctorCard.jsx';
import { ErrorNote, Loading } from '../components/Status.jsx';

export default function Home() {
  const specialties = useApi('/specialties');
  const doctors = useApi('/doctors');
  return (
    <>
      <section className="hero" style={{ backgroundImage: 'url(/images/hero.jpg)' }}>
        <div className="hero__shade" />
        <div className="hero__content">
          <p className="eyebrow">Same-week appointments · In person or video</p>
          <h1 className="hero__title">Care, when<br /><em>you need it.</em></h1>
          <p className="hero__lede">See real availability for {doctors.data?.length ?? 'our'} doctors across three clinics, and book your slot in under a minute.</p>
          <Link to="/doctors" className="btn btn--ghost">Find an appointment</Link>
        </div>
      </section>

      <section className="wrap">
        <p className="eyebrow eyebrow--dark">Specialties</p>
        <h2 className="h1">What do you need help with?</h2>
        {specialties.error && <ErrorNote error={specialties.error} />}
        <div className="specs">
          {specialties.data?.map((s) => (
            <Link key={s.slug} to={`/doctors?specialty=${s.slug}`} className="spec">
              <strong>{s.name}</strong>
              <span>{s.description}</span>
              <small>{s.doctors} doctor{s.doctors === 1 ? '' : 's'} →</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap wrap--tint">
        <p className="eyebrow eyebrow--dark">Our clinicians</p>
        <h2 className="h1">Booking soonest</h2>
        {doctors.loading && <Loading label="Checking calendars" />}
        {doctors.error && <ErrorNote error={doctors.error} />}
        <div className="docs">{doctors.data?.slice(0, 4).map((d) => <DoctorCard key={d.slug} d={d} />)}</div>
      </section>
    </>
  );
}
