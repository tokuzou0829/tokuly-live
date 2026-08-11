import { describe, expect, it } from "vitest";
import { buildSourceVideoHref } from "./clip-source-link";

describe("buildSourceVideoHref", () => {
  it("uses the clip start before playback begins", () => {
    expect(buildSourceVideoHref("video/key", 12.3, 0)).toBe("/video/video%2Fkey?t=12.3");
  });

  it("adds the current clip position and rounds to tenths", () => {
    expect(buildSourceVideoHref("video-key", 12.3, 5.46)).toBe("/video/video-key?t=17.8");
  });
});
