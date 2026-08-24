import { describe, expect, it } from "vitest";
import { parsePlaybackStartTime, resolvePlaybackStartTime } from "./playback-position";

describe("playback position", () => {
  it("prefers an explicit URL position over the restored position", () => {
    expect(resolvePlaybackStartTime("12.5", 45000)).toBe(12.5);
    expect(resolvePlaybackStartTime("0", 45000)).toBe(0);
  });

  it("uses the restored position when the URL position is absent or invalid", () => {
    expect(resolvePlaybackStartTime(null, 45000)).toBe(45);
    expect(resolvePlaybackStartTime("invalid", 45000)).toBe(45);
    expect(resolvePlaybackStartTime("-1", 45000)).toBe(45);
  });

  it("returns null when neither position is usable", () => {
    expect(parsePlaybackStartTime(undefined)).toBeNull();
    expect(resolvePlaybackStartTime(null)).toBeNull();
  });
});
