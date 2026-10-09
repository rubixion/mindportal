import { describe, it, expect } from "vitest";
import { habitStreak, localDate } from "../src/panel/lib/utils";

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDate(d);
};

describe("habitStreak", () => {
  it("counts consecutive days ending today", () => expect(habitStreak([daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(4)])).toBe(3));
  it("still counts yesterday's run when today isn't ticked yet", () => expect(habitStreak([daysAgo(1), daysAgo(2)])).toBe(2));
  it("is zero after a missed day", () => expect(habitStreak([daysAgo(2), daysAgo(3)])).toBe(0));
});
