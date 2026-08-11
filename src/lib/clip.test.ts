import { describe, expect, it } from "vitest";
import {
  buildCreateClipPayload,
  clipDisplayToMediaTime,
  clipMediaToDisplayTime,
  clipTimelineWindow,
  clipTicksToSeconds,
  formatClipTime,
  initialClipRange,
  moveClipRange,
  parseClipTime,
  secondsToClipTicks,
  updateClipRange,
} from "./clip";

describe("clip time helpers", () => {
  it("rounds seconds to integer tenths without retaining floating point noise", () => {
    expect(secondsToClipTicks(59.94)).toBe(599);
    expect(secondsToClipTicks(59.95)).toBe(600);
    expect(clipTicksToSeconds(599)).toBe(59.9);
  });

  it("formats and parses clip timestamps", () => {
    expect(formatClipTime(599)).toBe("00:59.9");
    expect(formatClipTime(600)).toBe("01:00.0");
    expect(formatClipTime(36_001)).toBe("01:00:00.1");
    expect(parseClipTime("01:02.3")).toBe(623);
    expect(parseClipTime("01:02:03.4")).toBe(37_234);
    expect(parseClipTime("00:60.0")).toBeNull();
    expect(parseClipTime("1:02.34")).toBeNull();
    expect(parseClipTime("1.2:03.4")).toBeNull();
  });

  it("selects up to 60 seconds and shifts the range back at the video end", () => {
    expect(initialClipRange(10, 120)).toEqual({ start: 100, end: 700 });
    expect(initialClipRange(95, 100)).toEqual({ start: 400, end: 1000 });
    expect(initialClipRange(0, 42.3)).toEqual({ start: 0, end: 423 });
  });

  it("keeps edited ranges inside the duration and the 60 second maximum", () => {
    expect(updateClipRange({ start: 0, end: 600 }, "end", 601, 1000)).toEqual({
      start: 0,
      end: 600,
    });
    expect(updateClipRange({ start: 0, end: 600 }, "start", 599, 1000)).toEqual({
      start: 599,
      end: 600,
    });
    expect(updateClipRange({ start: 400, end: 1000 }, "end", 1200, 1000)).toEqual({
      start: 400,
      end: 1000,
    });
  });

  it("creates a useful zoom window for a ten-hour video", () => {
    const tenHours = 10 * 60 * 60 * 10;
    expect(clipTimelineWindow(5 * 60 * 60 * 10, tenHours, 1200)).toEqual({
      start: 179_400,
      end: 180_600,
    });
    expect(clipTimelineWindow(10, tenHours, 1200)).toEqual({ start: 0, end: 1200 });
    expect(clipTimelineWindow(tenHours - 10, tenHours, 1200)).toEqual({
      start: tenHours - 1200,
      end: tenHours,
    });
  });

  it("moves a clip across a long video without changing its length", () => {
    const tenHours = 10 * 60 * 60 * 10;
    expect(moveClipRange({ start: 0, end: 600 }, 180_000, tenHours)).toEqual({
      start: 179_700,
      end: 180_300,
    });
    expect(moveClipRange({ start: 0, end: 600 }, tenHours, tenHours)).toEqual({
      start: tenHours - 600,
      end: tenHours,
    });
  });
});

describe("clip payload", () => {
  it("builds the future API payload with one-decimal second values", () => {
    expect(
      buildCreateClipPayload({
        streamId: 34,
        title: "  見どころ  ",
        range: { start: 123, end: 722 },
        durationTicks: 1000,
      })
    ).toEqual({
      payload: {
        title: "見どころ",
        source_video_id: 34,
        start_seconds: 12.3,
        end_seconds: 72.2,
      },
    });
  });

  it("accepts 60.0 seconds and rejects 60.1 seconds", () => {
    expect(
      buildCreateClipPayload({
        streamId: 2,
        title: "60秒",
        range: { start: 0, end: 600 },
        durationTicks: 1000,
      }).payload
    ).toBeDefined();
    expect(
      buildCreateClipPayload({
        streamId: 2,
        title: "長すぎる",
        range: { start: 0, end: 601 },
        durationTicks: 1000,
      }).error
    ).toContain("60.0秒以内");
  });

  it("rejects empty and out-of-video drafts", () => {
    expect(
      buildCreateClipPayload({
        streamId: 2,
        title: " ",
        range: { start: 0, end: 1 },
        durationTicks: 10,
      }).error
    ).toContain("タイトル");
    expect(
      buildCreateClipPayload({
        streamId: 2,
        title: "範囲外",
        range: { start: 0, end: 11 },
        durationTicks: 10,
      }).error
    ).toContain("動画内");
    expect(
      buildCreateClipPayload({
        streamId: 2,
        title: "あ".repeat(65),
        range: { start: 0, end: 1 },
        durationTicks: 10,
      }).error
    ).toContain("64文字以内");
  });
});

describe("clip playback time mapping", () => {
  it("maps source media time to a clamped zero-based clip timeline", () => {
    expect(clipMediaToDisplayTime(10, 12.3, 42.5)).toBe(0);
    expect(clipMediaToDisplayTime(22.3, 12.3, 42.5)).toBeCloseTo(10);
    expect(clipMediaToDisplayTime(50, 12.3, 42.5)).toBeCloseTo(30.2);
  });

  it("maps clip seeks back into the source range", () => {
    expect(clipDisplayToMediaTime(-1, 12.3, 42.5)).toBe(12.3);
    expect(clipDisplayToMediaTime(10, 12.3, 42.5)).toBeCloseTo(22.3);
    expect(clipDisplayToMediaTime(100, 12.3, 42.5)).toBe(42.5);
  });
});
