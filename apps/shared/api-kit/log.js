// One JSON object per line on stdout: easy to read with `kubectl logs` and
// easy for any log pipeline to parse.
export function log(level, msg, fields = {}) {
  const line = JSON.stringify({ time: new Date().toISOString(), level, msg, ...fields });
  if (level === 'error' || level === 'warn') console.error(line);
  else console.log(line);
}
