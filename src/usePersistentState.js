import { useState, useEffect } from 'react';

// useState that saves to localStorage so values survive reloads.
export default function usePersistentState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage unavailable (private mode, quota); keep in-memory value.
    }
  }, [key, value]);

  return [value, setValue];
}
