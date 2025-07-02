import { useState, useEffect, useRef } from "react";

/**
 * A custom hook that persists state in chrome.storage.local (for Chrome extensions)
 * or localStorage (for standard web apps).
 *
 * @param key The key to use for storing the value.
 * @param defaultValue The default value to use if no value is found in storage.
 * @returns A stateful value, and a function to update it.
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(defaultValue);
  const valueRef = useRef(value);
  valueRef.current = value;
  const debounceTimerRef = useRef<number | null>(null);
  const isWritingRef = useRef(false);
  const writeTimeoutRef = useRef<number | null>(null);

  // On initial mount, load the value from storage.
  useEffect(() => {
    let isMounted = true;

    // Use chrome.storage.local if available
    if (window.chrome && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([key], (result) => {
        if (isMounted && result[key] !== undefined) {
          setValue(result[key]);
        }
      });
    } else {
      // Fallback to localStorage
      try {
        const storedValue = localStorage.getItem(key);
        if (isMounted && storedValue !== null) {
          setValue(JSON.parse(storedValue));
        }
      } catch (error) {
        console.error(`Error reading localStorage key “${key}”:`, error);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [key]);

  // When the value changes, save it to storage (debounced).
  useEffect(() => {
    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set a new timer
    debounceTimerRef.current = window.setTimeout(() => {
      isWritingRef.current = true;
      // Use chrome.storage.local if available
      if (window.chrome && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [key]: value });
      } else {
        // Fallback to localStorage
        try {
          localStorage.setItem(key, JSON.stringify(value));
        } catch (error) {
          console.error(`Error setting localStorage key “${key}”:`, error);
        }
      }

      if (writeTimeoutRef.current) {
        clearTimeout(writeTimeoutRef.current);
      }
      writeTimeoutRef.current = window.setTimeout(() => {
        isWritingRef.current = false;
      }, 100);
    }, 250); // Debounce for 250ms

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (writeTimeoutRef.current) {
        clearTimeout(writeTimeoutRef.current);
      }
    };
  }, [key, value]);

  // Listen for changes in storage from other parts of the extension.
  useEffect(() => {
    if (window.chrome && chrome.storage && chrome.storage.onChanged) {
      const listener = (
        changes: { [key: string]: chrome.storage.StorageChange },
        areaName: string
      ) => {
        if (isWritingRef.current) {
          return;
        }

        if (areaName === "local" && key in changes) {
          // This check prevents an infinite loop by comparing the new value
          // from storage with the current value in our state (via a ref).
          if (
            JSON.stringify(changes[key].newValue) !==
            JSON.stringify(valueRef.current)
          ) {
            setValue(changes[key].newValue);
          }
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => {
        chrome.storage.onChanged.removeListener(listener);
      };
    }
  }, [key]); // This useEffect should only run once, so the dependency array only contains `key`.

  return [value, setValue];
}
