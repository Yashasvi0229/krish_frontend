import { useEffect, useState } from 'react';

/**
 * Debounce a value. Used for search inputs per spec 4.5, 5.5, 13.5 (300ms default).
 */
export default function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}
