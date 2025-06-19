import { useState, useEffect } from "react";

/**
 * usePersistentState
 * @param key - The key to use in localStorage
 * @param defaultValue - The default value if nothing is stored
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Handle storage errors if needed
    }
  }, [key, value]);

  return [value, setValue];
}
