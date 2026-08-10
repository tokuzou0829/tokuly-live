import type { Subtitle } from "@/types/live";

export const SUBTITLE_PREFERENCE_STORAGE_KEY = "tokuly:subtitle-preference";
export const SUBTITLE_DISPLAY_SETTINGS_STORAGE_KEY = "tokuly:subtitle-display-settings";

export type SubtitlePreference = { mode: "off" } | { mode: "language"; languageCode: string };

export type SubtitleDisplaySettings = {
  fontSize: 75 | 100 | 125 | 150 | 200;
  color: "white" | "yellow" | "cyan";
  backgroundOpacity: 0 | 25 | 50 | 75 | 100;
  edgeStyle: "none" | "shadow" | "outline" | "background";
};

export const DEFAULT_SUBTITLE_DISPLAY_SETTINGS: SubtitleDisplaySettings = {
  fontSize: 100,
  color: "white",
  backgroundOpacity: 75,
  edgeStyle: "background",
};

export type CustomSubtitleStyle = {
  fontSize: string;
  color: string;
  backgroundColor: string;
  textShadow: string;
};

type StorageReader = Pick<Storage, "getItem">;
type StorageWriter = Pick<Storage, "setItem">;

type SubtitleTrackTarget = {
  id: number;
  track: Pick<TextTrack, "mode">;
};

export type SubtitleCue = {
  startTime: number;
  endTime: number;
  text: string;
};

function normalizeLanguageCode(languageCode: string): string {
  return languageCode.trim().toLowerCase();
}

function getPrimaryLanguage(languageCode: string): string {
  return normalizeLanguageCode(languageCode).split("-")[0];
}

export function findPreferredSubtitle(
  subtitles: readonly Subtitle[],
  preferredLanguages: readonly string[]
): Subtitle | null {
  const languages = preferredLanguages.map(normalizeLanguageCode).filter(Boolean);

  for (const language of languages) {
    const exactMatch = subtitles.find(
      (subtitle) => normalizeLanguageCode(subtitle.language_code) === language
    );
    if (exactMatch) return exactMatch;
  }

  for (const language of languages) {
    const primaryLanguage = getPrimaryLanguage(language);
    const primaryMatch = subtitles.find(
      (subtitle) => getPrimaryLanguage(subtitle.language_code) === primaryLanguage
    );
    if (primaryMatch) return primaryMatch;
  }

  return null;
}

export function readSubtitlePreference(storage: StorageReader): SubtitlePreference | null {
  try {
    const value = storage.getItem(SUBTITLE_PREFERENCE_STORAGE_KEY);
    if (!value) return null;

    const preference: unknown = JSON.parse(value);
    if (
      typeof preference === "object" &&
      preference !== null &&
      "mode" in preference &&
      preference.mode === "off"
    ) {
      return { mode: "off" };
    }

    if (
      typeof preference === "object" &&
      preference !== null &&
      "mode" in preference &&
      preference.mode === "language" &&
      "languageCode" in preference &&
      typeof preference.languageCode === "string" &&
      preference.languageCode.trim() !== ""
    ) {
      return { mode: "language", languageCode: preference.languageCode };
    }
  } catch {
    // Storage access and invalid JSON both fall back to automatic selection.
  }

  return null;
}

export function writeSubtitlePreference(
  storage: StorageWriter,
  preference: SubtitlePreference
): void {
  try {
    storage.setItem(SUBTITLE_PREFERENCE_STORAGE_KEY, JSON.stringify(preference));
  } catch {
    // Playback and in-page selection should continue even when storage is unavailable.
  }
}

export function readSubtitleDisplaySettings(storage: StorageReader): SubtitleDisplaySettings {
  try {
    const value = storage.getItem(SUBTITLE_DISPLAY_SETTINGS_STORAGE_KEY);
    if (!value) return DEFAULT_SUBTITLE_DISPLAY_SETTINGS;

    const settings: unknown = JSON.parse(value);
    if (typeof settings !== "object" || settings === null) {
      return DEFAULT_SUBTITLE_DISPLAY_SETTINGS;
    }

    const fontSizes = [75, 100, 125, 150, 200];
    const colors = ["white", "yellow", "cyan"];
    const backgroundOpacities = [0, 25, 50, 75, 100];
    const edgeStyles = ["none", "shadow", "outline", "background"];

    return {
      fontSize:
        "fontSize" in settings && fontSizes.includes(Number(settings.fontSize))
          ? (Number(settings.fontSize) as SubtitleDisplaySettings["fontSize"])
          : DEFAULT_SUBTITLE_DISPLAY_SETTINGS.fontSize,
      color:
        "color" in settings && colors.includes(String(settings.color))
          ? (settings.color as SubtitleDisplaySettings["color"])
          : DEFAULT_SUBTITLE_DISPLAY_SETTINGS.color,
      backgroundOpacity:
        "backgroundOpacity" in settings &&
        backgroundOpacities.includes(Number(settings.backgroundOpacity))
          ? (Number(settings.backgroundOpacity) as SubtitleDisplaySettings["backgroundOpacity"])
          : DEFAULT_SUBTITLE_DISPLAY_SETTINGS.backgroundOpacity,
      edgeStyle:
        "edgeStyle" in settings && edgeStyles.includes(String(settings.edgeStyle))
          ? (settings.edgeStyle as SubtitleDisplaySettings["edgeStyle"])
          : DEFAULT_SUBTITLE_DISPLAY_SETTINGS.edgeStyle,
    };
  } catch {
    return DEFAULT_SUBTITLE_DISPLAY_SETTINGS;
  }
}

export function writeSubtitleDisplaySettings(
  storage: StorageWriter,
  settings: SubtitleDisplaySettings
): void {
  try {
    storage.setItem(SUBTITLE_DISPLAY_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // In-page styling should continue even when storage is unavailable.
  }
}

export function createSubtitleCueStyle(settings: SubtitleDisplaySettings): string {
  const style = createCustomSubtitleStyle(settings);

  return [
    `font-size: ${style.fontSize}`,
    `color: ${style.color}`,
    `background: ${style.backgroundColor}`,
    `text-shadow: ${style.textShadow}`,
  ].join("; ");
}

export function createCustomSubtitleStyle(settings: SubtitleDisplaySettings): CustomSubtitleStyle {
  const colors: Record<SubtitleDisplaySettings["color"], string> = {
    white: "#ffffff",
    yellow: "#ffff00",
    cyan: "#00ffff",
  };
  const edgeStyles: Record<SubtitleDisplaySettings["edgeStyle"], string> = {
    none: "none",
    shadow: "2px 2px 3px #000000",
    outline: "-1px -1px 0 #000000, 1px -1px 0 #000000, -1px 1px 0 #000000, 1px 1px 0 #000000",
    background: "none",
  };
  const fontSizes: Record<SubtitleDisplaySettings["fontSize"], string> = {
    75: "18px",
    100: "24px",
    125: "30px",
    150: "36px",
    200: "48px",
  };

  return {
    fontSize: fontSizes[settings.fontSize],
    color: colors[settings.color],
    backgroundColor: `rgba(0, 0, 0, ${
      settings.edgeStyle === "background" ? 1 : settings.backgroundOpacity / 100
    })`,
    textShadow: edgeStyles[settings.edgeStyle],
  };
}

export function calculateSubtitleBottomOffset(
  playerBottom: number,
  seekBarTop: number,
  gap = 12
): number | null {
  if (![playerBottom, seekBarTop, gap].every(Number.isFinite) || seekBarTop > playerBottom) {
    return null;
  }

  return Math.max(0, playerBottom - seekBarTop + gap);
}

function parseVttTimestamp(timestamp: string): number | null {
  const parts = timestamp.trim().split(":");
  if (parts.length !== 2 && parts.length !== 3) return null;
  const hasHours = parts.length === 3;

  const seconds = Number(parts.pop());
  const minutes = Number(parts.pop());
  const hours = hasHours ? Number(parts[0]) : 0;
  if (![hours, minutes, seconds].every(Number.isFinite)) return null;

  return hours * 3600 + minutes * 60 + seconds;
}

function stripVttMarkup(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"');
}

export function parseWebVtt(webVtt: string): SubtitleCue[] {
  const blocks = webVtt
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/);
  const cues: SubtitleCue[] = [];

  for (const block of blocks) {
    const lines = block.split("\n").map((line) => line.trimEnd());
    if (lines.length === 0 || /^(WEBVTT|NOTE|STYLE|REGION)(\s|$)/.test(lines[0])) continue;

    const timingLineIndex = lines.findIndex((line) => line.includes("-->"));
    if (timingLineIndex === -1) continue;

    const [startValue, endWithSettings] = lines[timingLineIndex].split("-->");
    const startTime = parseVttTimestamp(startValue);
    const endTime = parseVttTimestamp(endWithSettings.trim().split(/\s+/)[0]);
    if (startTime === null || endTime === null || endTime <= startTime) continue;

    const text = stripVttMarkup(lines.slice(timingLineIndex + 1).join("\n")).trim();
    if (text) cues.push({ startTime, endTime, text });
  }

  return cues;
}

export function resolveInitialSubtitle(
  subtitles: readonly Subtitle[],
  preferredLanguages: readonly string[],
  preference: SubtitlePreference | null
): Subtitle | null {
  if (preference?.mode === "off") return null;

  if (preference?.mode === "language") {
    const savedLanguageMatch = findPreferredSubtitle(subtitles, [preference.languageCode]);
    if (savedLanguageMatch) return savedLanguageMatch;
  }

  return findPreferredSubtitle(subtitles, preferredLanguages);
}

export function applySubtitleTrackSelection(
  tracks: readonly SubtitleTrackTarget[],
  selectedSubtitleId: number | null,
  selectedMode: TextTrackMode = "showing"
): void {
  for (const { id, track } of tracks) {
    track.mode = id === selectedSubtitleId ? selectedMode : "disabled";
  }
}
