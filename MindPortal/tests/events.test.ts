import { describe, it, expect } from "vitest";
import { at, nextOccurrence, nextReminder, occursOn } from "../src/shared/events";
import type { CalEvent } from "../src/shared/types";

const ev = (p: Partial<CalEvent>): CalEvent => ({ id: "x", title: "t", date: "2026-10-08", time: "09:00", remind: true, ...p }); // Oct 8 2026 = Thursday

describe("occursOn", () => {
  it("one-off only on its day", () => {
    expect(occursOn(ev({}), "2026-10-08")).toBe(true);
    expect(occursOn(ev({}), "2026-10-09")).toBe(false);
  });
  it("never before the first date", () => expect(occursOn(ev({ repeat: "daily" }), "2026-10-07")).toBe(false));
  it("weekdays skips the weekend", () => {
    expect(occursOn(ev({ repeat: "weekdays" }), "2026-10-09")).toBe(true); // Fri
    expect(occursOn(ev({ repeat: "weekdays" }), "2026-10-10")).toBe(false); // Sat
  });
  it("weekly on the same weekday", () => expect(occursOn(ev({ repeat: "weekly" }), "2026-10-15")).toBe(true));
  it("monthly skips months without the day", () => {
    const e = ev({ date: "2026-01-31", repeat: "monthly" });
    expect(occursOn(e, "2026-02-28")).toBe(false);
    expect(nextOccurrence(e, "2026-02-01")).toBe("2026-03-31");
  });
  it("yearly", () => expect(nextOccurrence(ev({ repeat: "yearly" }), "2026-10-09")).toBe("2027-10-08"));
});

describe("nextReminder", () => {
  it("fires at start for a future one-off", () => expect(nextReminder(ev({}), at("2026-10-08", "08:00"))).toBe(at("2026-10-08", "09:00")));
  it("respects minutes before", () => expect(nextReminder(ev({ remindBefore: 15 }), at("2026-10-08", "08:00"))).toBe(at("2026-10-08", "08:45")));
  it("is null once a one-off has passed", () => expect(nextReminder(ev({}), at("2026-10-08", "10:00"))).toBeNull());
  it("moves to the next repeat once today's has passed", () =>
    expect(nextReminder(ev({ repeat: "daily" }), at("2026-10-08", "10:00"))).toBe(at("2026-10-09", "09:00")));
  it("finds a 1-day-before reminder for tomorrow", () =>
    expect(nextReminder(ev({ date: "2026-10-09", remindBefore: 1440 }), at("2026-10-08", "08:00"))).toBe(at("2026-10-08", "09:00")));
  it("no reminder for all-day events", () => expect(nextReminder(ev({ time: "" }), at("2026-10-01", "08:00"))).toBeNull());
});
