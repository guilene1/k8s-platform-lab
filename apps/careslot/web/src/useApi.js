import { useEffect, useState } from 'react';
import { api } from './api.js';

/** Fetch `path` (re-fetching when it changes). Returns { data, error, loading }. */
export function useApi(path) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  useEffect(() => {
    if (!path) return undefined;
    let live = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    api(path)
      .then((data) => live && setState({ data, error: null, loading: false }))
      .catch((error) => live && setState({ data: null, error, loading: false }));
    return () => { live = false; };
  }, [path]);
  return state;
}
