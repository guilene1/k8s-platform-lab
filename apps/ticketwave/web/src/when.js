// Show times in the venue's own time zone (doors at 8pm means 8pm there).
export const when = (iso, timeZone) => {
  const d = new Date(iso);
  const o = { timeZone };
  return {
    day: d.toLocaleDateString('en-US', { ...o, day: '2-digit' }),
    month: d.toLocaleDateString('en-US', { ...o, month: 'short' }).toUpperCase(),
    weekday: d.toLocaleDateString('en-US', { ...o, weekday: 'long' }),
    time: d.toLocaleTimeString('en-US', { ...o, hour: 'numeric', minute: '2-digit' }),
    full: d.toLocaleString('en-US', { ...o, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }),
  };
};
