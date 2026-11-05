// Small, dependency-free SVG charts.

export function WeeklyBars({ weeks, goal }) {
  const W = 640;
  const H = 240;
  const pad = { l: 36, r: 10, t: 16, b: 30 };
  const max = Math.max(goal * 1.15, ...weeks.map((w) => w.km), 1);
  const bw = (W - pad.l - pad.r) / weeks.length;
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const ticks = [0, Math.round(max / 2), Math.round(max)];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Weekly distance in kilometres">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="chart__grid" />
          <text x={pad.l - 8} y={y(t) + 4} className="chart__tick" textAnchor="end">{t}</text>
        </g>
      ))}
      <line x1={pad.l} x2={W - pad.r} y1={y(goal)} y2={y(goal)} className="chart__goal" />
      <text x={W - pad.r} y={y(goal) - 6} className="chart__goal-label" textAnchor="end">GOAL {goal} KM</text>
      {weeks.map((w, i) => {
        const x = pad.l + i * bw + bw * 0.18;
        const current = i === weeks.length - 1;
        return (
          <g key={w.week_start}>
            <rect x={x} y={y(w.km)} width={bw * 0.64} height={Math.max(0, H - pad.b - y(w.km))}
              className={`chart__bar ${w.km >= goal ? 'is-hit' : ''} ${current ? 'is-now' : ''}`}><title>{`${w.week_start}: ${w.km} km`}</title></rect>
            <text x={x + bw * 0.32} y={H - 10} className="chart__tick" textAnchor="middle">
              {new Date(`${w.week_start}T12:00:00Z`).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', timeZone: 'UTC' })}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function TypeSplit({ byType, labels }) {
  const total = byType.reduce((s, t) => s + t.minutes, 0) || 1;
  return (
    <div className="split">
      <div className="split__bar">
        {byType.map((t, i) => <span key={t.type} className={`split__seg c${i % 6}`} style={{ width: `${(t.minutes / total) * 100}%` }} title={`${t.type}: ${t.minutes} min`} />)}
      </div>
      <ul className="split__legend">
        {byType.map((t, i) => (
          <li key={t.type}><i className={`c${i % 6}`} />{labels[t.type]?.label || t.type}<span>{Math.round((t.minutes / total) * 100)}% · {t.sessions}×</span></li>
        ))}
      </ul>
    </div>
  );
}
