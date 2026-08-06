import { describe, expect, it } from "vitest";
import { formatDuration } from "./duration";

describe("formatDuration", () => {
  it.each([
    [0, "00:00"],
    [65, "01:05"],
    [3599, "59:59"],
    [3600, "01:00:00"],
    [360000, "100:00:00"],
    [65.9, "01:05"],
  ])("formats %s seconds as %s", (seconds, expected) => {
    expect(formatDuration(seconds)).toBe(expected);
  });

  it.each([null, undefined, -1, Number.NaN, Number.POSITIVE_INFINITY])(
    "returns null for %s",
    (seconds) => {
      expect(formatDuration(seconds)).toBeNull();
    }
  );
});
