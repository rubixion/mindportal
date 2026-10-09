import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useCallback, useEffect, useRef, useState } from "react";
import { localDate } from "../../shared/events";

export { localDate, parseLocalDate } from "../../shared/events";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// randomUUID is missing on plain-http pages, where the overlay also runs
export const uid = () => crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);

/** Consecutive days done, counting back from today (or yesterday if today isn't ticked yet). */
export function habitStreak(days: string[]): number {
  const set = new Set(days);
  const d = new Date();
  if (!set.has(localDate(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(localDate(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function send<T = unknown>(msg: Record<string, unknown>): Promise<T> {
  return chrome.runtime.sendMessage(msg) as Promise<T>;
}

/**
 * State mirrored to chrome.storage.local and synced across tabs.
 * Echoes of our own writes are ignored while they are in flight so fast typing never reverts.
 */
export function useStored<T>(key: string, fallback: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(fallback);
  const ref = useRef(value);
  const pending = useRef(0);
  const fb = useRef(fallback);

  useEffect(() => {
    let alive = true;
    chrome.storage.local.get(key).then((r) => {
      if (alive && r[key] !== undefined && pending.current === 0) {
        ref.current = r[key] as T;
        setValue(r[key] as T);
      }
    });
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== "local" || !(key in changes) || pending.current > 0) return;
      const next = (changes[key]!.newValue as T | undefined) ?? fb.current;
      ref.current = next;
      setValue(next);
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => {
      alive = false;
      chrome.storage.onChanged.removeListener(onChange);
    };
  }, [key]);

  const set = useCallback(
    (v: T | ((prev: T) => T)) => {
      const next = typeof v === "function" ? (v as (p: T) => T)(ref.current) : v;
      ref.current = next;
      setValue(next);
      pending.current++;
      chrome.storage.local.set({ [key]: next }).finally(() => pending.current--);
    },
    [key],
  );

  return [value, set];
}

/** How many dropdowns/pickers are open; the panel ignores Escape while any are (they close first). */
export const popups = { open: 0 };

/** Registers an open popup with `popups` while `open` is true. */
export function usePopup(open: boolean) {
  useEffect(() => {
    if (!open) return;
    popups.open++;
    // released a tick late so the same Escape keypress doesn't reach the panel after the popup closes
    return () => void setTimeout(() => popups.open--, 0);
  }, [open]);
}

/** Re-renders every `ms` (for countdowns). */
export function useNow(ms = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

export function download(filename: string, text: string, type = "text/plain") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
