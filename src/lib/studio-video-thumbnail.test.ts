import { describe, expect, it } from "vitest";
import {
  AUTO_THUMBNAIL_HEIGHT,
  AUTO_THUMBNAIL_QUALITY,
  AUTO_THUMBNAIL_WIDTH,
  automaticThumbnailCaptureTime,
  coverDrawRect,
} from "./studio-video-thumbnail";

describe("Studio automatic video thumbnail", () => {
  it("uses the configured JPEG output dimensions and quality", () => {
    expect(AUTO_THUMBNAIL_WIDTH).toBe(1920);
    expect(AUTO_THUMBNAIL_HEIGHT).toBe(1080);
    expect(AUTO_THUMBNAIL_QUALITY).toBe(0.85);
  });

  it("captures the frame at ten percent of the video duration", () => {
    expect(automaticThumbnailCaptureTime(100)).toBe(10);
    expect(automaticThumbnailCaptureTime(5)).toBe(0.5);
    expect(automaticThumbnailCaptureTime(Number.NaN)).toBe(0);
  });

  it("center-crops portrait video to a 16:9 target", () => {
    const rect = coverDrawRect(1080, 1920, 1920, 1080);
    expect(rect.x).toBe(0);
    expect(rect.y).toBeLessThan(0);
    expect(rect.width).toBe(1920);
    expect(rect.height).toBeGreaterThan(1080);
  });

  it("center-crops a 4:3 video vertically", () => {
    expect(coverDrawRect(1440, 1080, 1920, 1080)).toEqual({
      x: 0,
      y: -180,
      width: 1920,
      height: 1440,
    });
  });
});
