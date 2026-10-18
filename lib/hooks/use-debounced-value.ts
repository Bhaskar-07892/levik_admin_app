"use client";

import { useEffect, useState } from "react";

/** Returns `value` after it has stopped changing for `delay` ms (keeps search inputs from firing a request per keystroke). */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
