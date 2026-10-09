import type { CalEvent, Repeat } from "./types";

/** Local-time YYYY-MM-DD (calendar + habits care about the user's day, not UTC). */
export function localDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseLocalDate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
}

export function addDays(key: string, n: number): string {
  const d = parseLocalDate(key);
  d.setDate(d.getDate() + n);
  return localDate(d);
}

/** Epoch ms for a local date + "HH:MM". */
export function at(key: string, time: string): number {
  const d = parseLocalDate(key);
  const [h, m] = time.split(":").map(Number);
  d.setHours(h!, m!, 0, 0);
  return d.getTime();
}

export const REPEAT_LABELS: Record<Repeat, string> = {
  none: "Does not repeat",
  daily: "Every day",
  weekdays: "Every weekday (Mon–Fri)",
  weekly: "Every week",
  monthly: "Every month",
  yearly: "Every year",
};

export const REMINDER_OPTIONS: { value: number; label: string }[] = [
  { value: -1, label: "No reminder" },
  { value: 0, label: "At start time" },
  { value: 5, label: "5 minutes before" },
  { value: 10, label: "10 minutes before" },
  { value: 15, label: "15 minutes before" },
  { value: 30, label: "30 minutes before" },
  { value: 60, label: "1 hour before" },
  { value: 1440, label: "1 day before" },
];

/** Does event `e` happen on local date `key`? Handles repeating events. */
export function occursOn(e: CalEvent, key: string): boolean {
  if (key < e.date) return false;
  const repeat = e.repeat ?? "none";
  if (repeat === "none") return key === e.date;
  if (repeat === "daily") return true;
  const d = parseLocalDate(key);
  const start = parseLocalDate(e.date);
  switch (repeat) {
    case "weekdays":
      return d.getDay() >= 1 && d.getDay() <= 5;
    case "weekly":
      return d.getDay() === start.getDay();
    case "monthly": // the 31st only happens in months that have one
      return d.getDate() === start.getDate();
    case "yearly":
      return d.getMonth() === start.getMonth() && d.getDate() === start.getDate();
  }
}

/** First date on or after `fromKey` that `e` happens on, or null. */
export function nextOccurrence(e: CalEvent, fromKey: string): string | null {
  let key = fromKey < e.date ? e.date : fromKey;
  if ((e.repeat ?? "none") === "none") return key === e.date ? key : null;
  // ponytail: day-by-day scan; 1500 days covers a yearly Feb 29 event
  for (let i = 0; i < 1500; i++, key = addDays(key, 1)) if (occursOn(e, key)) return key;
  return null;
}

/** All-day events have no start time, so their reminders are anchored here. */
export const ALL_DAY_REMINDER_TIME = "09:00";

/** When the next reminder for `e` should fire (epoch ms after `now`), or null. */
export function nextReminder(e: CalEvent, now: number): number | null {
  if (!e.remind) return null;
  const base = e.time || ALL_DAY_REMINDER_TIME;
  const before = Math.max(0, e.remindBefore ?? 0) * 60_000;
  // start a day back so a "1 day before" reminder for tomorrow is still found
  let key = nextOccurrence(e, localDate(new Date(now - 86_400_000)));
  for (let i = 0; i < 5 && key; i++) {
    const when = at(key, base) - before;
    if (when > now) return when;
    key = nextOccurrence(e, addDays(key, 1));
  }
  return null;
}

/** "9:30 AM" style label for "HH:MM". */
export function timeLabel(time: string): string {
  if (!time) return "All day";
  const [h, m] = time.split(":").map(Number);
  return `${h! % 12 || 12}:${String(m).padStart(2, "0")} ${h! < 12 ? "AM" : "PM"}`;
}

export function timeRange(e: Pick<CalEvent, "time" | "endTime">): string {
  if (!e.time) return "All day";
  return e.endTime ? `${timeLabel(e.time)} – ${timeLabel(e.endTime)}` : timeLabel(e.time);
}
