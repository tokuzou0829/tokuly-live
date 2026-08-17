import { describe, expect, it } from "vitest";
import {
  legacyVideoPreviewFrameAt,
  parseVideoPreviewManifest,
  videoPreviewFrameAt,
} from "./video-preview";

const manifestUrl = "https://live-data.tokuly.com/videos/hls/demo/video_preview/manifest.json";

describe("video preview manifest", () => {
  it("parses a manifest and resolves relative sprite URLs", () => {
    const manifest = parseVideoPreviewManifest(
      {
        version: 1,
        intervalSeconds: 45,
        frameCount: 26,
        tileWidth: 160,
        tileHeight: 90,
        columns: 5,
        rows: 5,
        sprites: ["video_preview_001.jpg", "video_preview_002.jpg"],
      },
      manifestUrl
    );

    expect(manifest?.sprites[1]).toBe(
      "https://live-data.tokuly.com/videos/hls/demo/video_preview/video_preview_002.jpg"
    );
  });

  it("rejects manifests that do not contain enough sprite capacity", () => {
    expect(
      parseVideoPreviewManifest(
        {
          version: 1,
          intervalSeconds: 5,
          frameCount: 26,
          tileWidth: 160,
          tileHeight: 90,
          columns: 5,
          rows: 5,
          sprites: ["video_preview_001.jpg"],
        },
        manifestUrl
      )
    ).toBeNull();
  });

  it("does not select a preview from the following interval", () => {
    const manifest = parseVideoPreviewManifest(
      {
        version: 1,
        intervalSeconds: 45,
        frameCount: 26,
        tileWidth: 160,
        tileHeight: 90,
        columns: 5,
        rows: 5,
        sprites: ["video_preview_001.jpg", "video_preview_002.jpg"],
      },
      manifestUrl
    );

    expect(videoPreviewFrameAt(manifest!, 45 * 25)).toEqual({
      imageUrl: "https://live-data.tokuly.com/videos/hls/demo/video_preview/video_preview_001.jpg",
      x: -640,
      y: -360,
      tileWidth: 160,
      tileHeight: 90,
      sheetWidth: 800,
      sheetHeight: 450,
    });
    expect(videoPreviewFrameAt(manifest!, 45 * 25 + 0.001)).toEqual({
      imageUrl: "https://live-data.tokuly.com/videos/hls/demo/video_preview/video_preview_001.jpg",
      x: -640,
      y: -360,
      tileWidth: 160,
      tileHeight: 90,
      sheetWidth: 800,
      sheetHeight: 450,
    });
    expect(videoPreviewFrameAt(manifest!, 45 * 26)).toEqual({
      imageUrl: "https://live-data.tokuly.com/videos/hls/demo/video_preview/video_preview_002.jpg",
      x: 0,
      y: 0,
      tileWidth: 160,
      tileHeight: 90,
      sheetWidth: 800,
      sheetHeight: 450,
    });
  });

  it("clamps times after the final generated frame", () => {
    const manifest = parseVideoPreviewManifest(
      {
        version: 1,
        intervalSeconds: 45,
        frameCount: 2,
        tileWidth: 160,
        tileHeight: 90,
        columns: 5,
        rows: 5,
        sprites: ["video_preview_001.jpg"],
      },
      manifestUrl
    );

    expect(videoPreviewFrameAt(manifest!, 999)?.x).toBe(-160);
  });

  it("returns variable tile dimensions and positions from the manifest", () => {
    const manifest = parseVideoPreviewManifest(
      {
        version: 1,
        intervalSeconds: 10,
        frameCount: 5,
        tileWidth: 240,
        tileHeight: 135,
        columns: 2,
        rows: 2,
        sprites: ["sheet-a.jpg", "sheet-b.jpg"],
      },
      manifestUrl
    );

    expect(videoPreviewFrameAt(manifest!, 50)).toEqual({
      imageUrl: "https://live-data.tokuly.com/videos/hls/demo/video_preview/sheet-b.jpg",
      x: 0,
      y: 0,
      tileWidth: 240,
      tileHeight: 135,
      sheetWidth: 480,
      sheetHeight: 270,
    });
  });
});

describe("legacy video previews", () => {
  it("moves to the first tile of the second sprite at 125 seconds", () => {
    expect(legacyVideoPreviewFrameAt("https://example.test/video_preview_", 125)).toEqual({
      imageUrl: "https://example.test/video_preview_002.jpg",
      x: 0,
      y: 0,
      tileWidth: 160,
      tileHeight: 90,
      sheetWidth: 800,
      sheetHeight: 450,
    });
  });
});
