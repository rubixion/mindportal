import { describe, it, expect } from "vitest";
import { focusXP } from "../src/shared/utils";

const MIN = 60_000;
const t0 = 1_000_000_000_000;

describe("focusXP", () => {
  it("pays nothing for start/stop spam", () => expect(focusXP(t0, t0 + 3_000, t0 + 25 * MIN)).toBe(0));
  it("pays nothing under 5 minutes", () => expect(focusXP(t0, t0 + 4.9 * MIN, t0 + 25 * MIN)).toBe(0));
  it("pays 1 XP per minute when ended early", () => expect(focusXP(t0, t0 + 12.5 * MIN, t0 + 25 * MIN)).toBe(12));
  it("pays a 1.5x bonus for finishing", () => expect(focusXP(t0, t0 + 25 * MIN, t0 + 25 * MIN)).toBe(38));
  it("never pays past the planned end", () => expect(focusXP(t0, t0 + 90 * MIN, t0 + 25 * MIN)).toBe(38));
  it("doesn't pay twice for overlapping time", () =>
    // pomodoro already credited the first 20 minutes of this focus block
    expect(focusXP(t0, t0 + 30 * MIN, t0 + 30 * MIN, t0 + 20 * MIN)).toBe(15));
});
