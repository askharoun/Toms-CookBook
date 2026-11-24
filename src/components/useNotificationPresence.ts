"use client";
import { useEffect, useState } from "react";

// Retain the last message until its exit transition finishes.
export function useNotificationPresence<T>(value: T | null) {
  const [retained, setRetained] = useState(value);
  useEffect(() => {
    if (value) { setRetained(value); return; }
    const timer = setTimeout(() => setRetained(null), 220);
    return () => clearTimeout(timer);
  }, [value]);
  return { item: value ?? retained, exiting: !value };
}
