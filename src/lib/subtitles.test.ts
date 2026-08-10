import { describe, expect, it, vi } from "vitest";
import type { Subtitle } from "@/types/live";
import {
  DEFAULT_SUBTITLE_DISPLAY_SETTINGS,
  SUBTITLE_DISPLAY_SETTINGS_STORAGE_KEY,
  SUBTITLE_PREFERENCE_STORAGE_KEY,
  applySubtitleTrackSelection,
  calculateSubtitleBottomOffset,
  createCustomSubtitleStyle,
  createSubtitleCueStyle,
  findPreferredSubtitle,
  parseWebVtt,
  readSubtitleDisplaySettings,
  readSubtitlePreference,
  resolveInitialSubtitle,
  writeSubtitlePreference,
  writeSubtitleDisplaySettings,
} from "./subtitles";

const subtitles: Subtitle[] = [
  { id: 41, language_code: "ja", label: "日本語", format: "vtt", url: "/41" },
  { id: 42, language_code: "en-US", label: "English (US)", format: "vtt", url: "/42" },
  { id: 43, language_code: "en-US", label: "English commentary", format: "vtt", url: "/43" },
];

describe("findPreferredSubtitle", () => {
  it("prefers an exact match across device languages before a primary-language match", () => {
    expect(findPreferredSubtitle(subtitles, ["en-GB", "JA"])?.id).toBe(41);
  });

  it("matches language tags case-insensitively", () => {
    expect(findPreferredSubtitle(subtitles, ["EN-us"])?.id).toBe(42);
  });

  it("falls back to the primary language", () => {
    expect(findPreferredSubtitle(subtitles, ["en-GB"])?.id).toBe(42);
  });

  it("uses the first API item when multiple subtitles have equal priority", () => {
    expect(findPreferredSubtitle(subtitles, ["en-US"])?.id).toBe(42);
  });

  it("returns null when no language matches", () => {
    expect(findPreferredSubtitle(subtitles, ["fr-FR"])).toBeNull();
  });
});

describe("subtitle preference", () => {
  it("reads and writes a global language preference", () => {
    const setItem = vi.fn();
    writeSubtitlePreference({ setItem }, { mode: "language", languageCode: "en-US" });
    expect(setItem).toHaveBeenCalledWith(
      SUBTITLE_PREFERENCE_STORAGE_KEY,
      JSON.stringify({ mode: "language", languageCode: "en-US" })
    );

    const getItem = vi.fn(() => JSON.stringify({ mode: "language", languageCode: "en-US" }));
    expect(readSubtitlePreference({ getItem })).toEqual({
      mode: "language",
      languageCode: "en-US",
    });
  });

  it("preserves an explicit off preference", () => {
    const getItem = vi.fn(() => JSON.stringify({ mode: "off" }));
    expect(readSubtitlePreference({ getItem })).toEqual({ mode: "off" });
    expect(resolveInitialSubtitle(subtitles, ["ja"], { mode: "off" })).toBeNull();
  });

  it("ignores malformed stored data", () => {
    expect(readSubtitlePreference({ getItem: () => "not-json" })).toBeNull();
    expect(
      readSubtitlePreference({ getItem: () => JSON.stringify({ mode: "language" }) })
    ).toBeNull();
  });

  it("falls back to device languages without overwriting an unavailable saved language", () => {
    expect(
      resolveInitialSubtitle(subtitles, ["ja-JP"], {
        mode: "language",
        languageCode: "fr-FR",
      })?.id
    ).toBe(41);
  });
});

describe("applySubtitleTrackSelection", () => {
  it("shows only the selected track and disables all others", () => {
    const tracks = [
      { id: 41, track: { mode: "showing" as TextTrackMode } },
      { id: 42, track: { mode: "disabled" as TextTrackMode } },
    ];

    applySubtitleTrackSelection(tracks, 42);
    expect(tracks.map(({ track }) => track.mode)).toEqual(["disabled", "showing"]);

    applySubtitleTrackSelection(tracks, null);
    expect(tracks.map(({ track }) => track.mode)).toEqual(["disabled", "disabled"]);
  });

  it("can keep the selected native track hidden for custom rendering", () => {
    const tracks = [{ id: 41, track: { mode: "disabled" as TextTrackMode } }];
    applySubtitleTrackSelection(tracks, 41, "hidden");
    expect(tracks[0].track.mode).toBe("hidden");
  });
});

describe("parseWebVtt", () => {
  it("parses timestamps, cue settings, identifiers, and multiline text", () => {
    expect(
      parseWebVtt(
        `WEBVTT\n\nfirst\n00:00:01.000 --> 00:00:03.500 align:center\n字幕 <b>テキスト</b>\n2行目`
      )
    ).toEqual([{ startTime: 1, endTime: 3.5, text: "字幕 テキスト\n2行目" }]);
  });

  it("ignores metadata and malformed cues", () => {
    expect(parseWebVtt("WEBVTT\n\nNOTE memo\nignored\n\ninvalid\nnot a cue")).toEqual([]);
  });
});

describe("subtitle display settings", () => {
  it("uses an opaque black background by default", () => {
    expect(DEFAULT_SUBTITLE_DISPLAY_SETTINGS.edgeStyle).toBe("background");
    expect(createCustomSubtitleStyle(DEFAULT_SUBTITLE_DISPLAY_SETTINGS).backgroundColor).toBe(
      "rgba(0, 0, 0, 1)"
    );
  });

  it("reads valid settings and fills invalid fields with defaults", () => {
    const settings = readSubtitleDisplaySettings({
      getItem: () =>
        JSON.stringify({
          fontSize: 150,
          color: "yellow",
          backgroundOpacity: 999,
          edgeStyle: "outline",
        }),
    });

    expect(settings).toEqual({
      fontSize: 150,
      color: "yellow",
      backgroundOpacity: DEFAULT_SUBTITLE_DISPLAY_SETTINGS.backgroundOpacity,
      edgeStyle: "outline",
    });
  });

  it("falls back to defaults for malformed settings", () => {
    expect(readSubtitleDisplaySettings({ getItem: () => "invalid-json" })).toEqual(
      DEFAULT_SUBTITLE_DISPLAY_SETTINGS
    );
  });

  it.each(["none", "shadow", "outline"] as const)(
    "preserves a saved %s edge style",
    (edgeStyle) => {
      expect(
        readSubtitleDisplaySettings({
          getItem: () => JSON.stringify({ ...DEFAULT_SUBTITLE_DISPLAY_SETTINGS, edgeStyle }),
        }).edgeStyle
      ).toBe(edgeStyle);
    }
  );

  it("persists display settings", () => {
    const setItem = vi.fn();
    writeSubtitleDisplaySettings({ setItem }, DEFAULT_SUBTITLE_DISPLAY_SETTINGS);
    expect(setItem).toHaveBeenCalledWith(
      SUBTITLE_DISPLAY_SETTINGS_STORAGE_KEY,
      JSON.stringify(DEFAULT_SUBTITLE_DISPLAY_SETTINGS)
    );
  });

  it("creates safe WebVTT cue styles", () => {
    expect(
      createSubtitleCueStyle({
        fontSize: 125,
        color: "cyan",
        backgroundOpacity: 50,
        edgeStyle: "outline",
      })
    ).toContain("font-size: 30px; color: #00ffff; background: rgba(0, 0, 0, 0.5)");
  });

  it("creates an opaque black background style independently of the saved opacity", () => {
    expect(
      createSubtitleCueStyle({
        fontSize: 100,
        color: "white",
        backgroundOpacity: 0,
        edgeStyle: "background",
      })
    ).toContain("background: rgba(0, 0, 0, 1); text-shadow: none");
  });

  it.each([
    ["none", "none"],
    ["shadow", "2px 2px 3px #000000"],
    ["outline", "-1px -1px 0 #000000, 1px -1px 0 #000000, -1px 1px 0 #000000, 1px 1px 0 #000000"],
    ["background", "none"],
  ] as const)("creates the custom %s style", (edgeStyle, textShadow) => {
    const style = createCustomSubtitleStyle({
      ...DEFAULT_SUBTITLE_DISPLAY_SETTINGS,
      edgeStyle,
    });
    expect(style.textShadow).toBe(textShadow);
    expect(style.backgroundColor).toBe(
      edgeStyle === "background" ? "rgba(0, 0, 0, 1)" : "rgba(0, 0, 0, 0.75)"
    );
  });
});

describe("calculateSubtitleBottomOffset", () => {
  it("places subtitles twelve pixels above the measured seekbar", () => {
    expect(calculateSubtitleBottomOffset(720, 640)).toBe(92);
  });

  it("supports a custom gap", () => {
    expect(calculateSubtitleBottomOffset(720, 640, 20)).toBe(100);
  });

  it("falls back when the measurement is invalid", () => {
    expect(calculateSubtitleBottomOffset(Number.NaN, 640)).toBeNull();
    expect(calculateSubtitleBottomOffset(640, 720)).toBeNull();
  });
});
