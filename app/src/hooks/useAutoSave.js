import { useEffect, useRef, useState } from 'react';

/**
 * Auto-save hook for the Review Screen (spec 7.8):
 * "Auto-save with debounce (1 second) after any edit"
 *
 * @param {any} data - The current data to save
 * @param {Function} saveFn - async function(data) that persists the data
 * @param {number} delay - Debounce ms
 */
export default function useAutoSave(data, saveFn, delay = 1000) {
  const [status, setStatus] = useState('idle'); // idle | saving | saved | error
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const firstRunRef = useRef(true);
  const timerRef = useRef(null);

  useEffect(() => {
    // Skip on mount — only save on actual edits
    if (firstRunRef.current) {
      firstRunRef.current = false;
      return;
    }
    if (!data) return;

    clearTimeout(timerRef.current);
    setStatus('saving');

    timerRef.current = setTimeout(async () => {
      try {
        await saveFn(data);
        setStatus('saved');
        setLastSavedAt(new Date());
      } catch (e) {
        setStatus('error');
      }
    }, delay);

    return () => clearTimeout(timerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  return { status, lastSavedAt };
}
