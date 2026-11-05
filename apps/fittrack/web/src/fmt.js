export const TYPES = {
  run: { label: 'Run', img: '/images/types/run.jpg' },
  ride: { label: 'Ride', img: '/images/types/ride.jpg' },
  intervals: { label: 'Intervals', img: '/images/types/intervals.jpg' },
  trail: { label: 'Trail', img: '/images/types/trail.jpg' },
  sprint: { label: 'Sprint', img: '/images/types/sprint.jpg' },
  hills: { label: 'Hills', img: '/images/types/hills.jpg' },
  strength: { label: 'Strength', img: '/images/types/intervals.jpg' },
  yoga: { label: 'Yoga', img: '/images/types/hills.jpg' },
};

export const duration = (s) => {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return h ? `${h}h ${String(m).padStart(2, '0')}m` : `${m} min`;
};

export const pace = (sPerKm) => (sPerKm ? `${Math.floor(sPerKm / 60)}:${String(sPerKm % 60).padStart(2, '0')} /km` : '—');

export const dateShort = (iso) => new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
