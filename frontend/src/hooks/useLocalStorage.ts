/**
 * Local storage hook with TypeScript support
 */

import { useState } from 'react';

export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored !== null ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setValueWrapped = (newValue: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const valueToStore = typeof newValue === 'function' ? (newValue as (prev: T) => T)(prev) : newValue;
      try {
        localStorage.setItem(key, JSON.stringify(valueToStore));
      } catch (error) {
        console.error(`Failed to save to localStorage key "${key}":`, error);
      }
      return valueToStore;
    });
  };

  return [value, setValueWrapped];
}
