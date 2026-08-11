export const CLIP_TICKS_PER_SECOND = 10;
export const MIN_CLIP_TICKS = 1;
export const MAX_CLIP_TICKS = 60 * CLIP_TICKS_PER_SECOND;
export const MAX_CLIP_TITLE_LENGTH = 64;

export type ClipRange = {
  start: number;
  end: number;
};

export type ClipTimelineWindow = {
  start: number;
  end: number;
};

export type CreateClipPayload = {
  title: string;
  source_video_id: number;
  start_seconds: number;
  end_seconds: number;
};

export function secondsToClipTicks(seconds: number): number {
  if (!Number.isFinite(seconds)) return 0;
  return Math.round(seconds * CLIP_TICKS_PER_SECOND);
}

export function clipTicksToSeconds(ticks: number): number {
  return Math.round(ticks) / CLIP_TICKS_PER_SECOND;
}

export function clipMediaToDisplayTime(
  mediaTime: number,
  startSeconds: number,
  endSeconds: number
): number {
  const duration = Math.max(0, endSeconds - startSeconds);
  return Math.min(duration, Math.max(0, mediaTime - startSeconds));
}

export function clipDisplayToMediaTime(
  displayTime: number,
  startSeconds: number,
  endSeconds: number
): number {
  const duration = Math.max(0, endSeconds - startSeconds);
  return startSeconds + Math.min(duration, Math.max(0, displayTime));
}

export function formatClipTime(ticks: number): string {
  const safeTicks = Math.max(0, Math.round(ticks));
  const hours = Math.floor(safeTicks / 36_000);
  const minutes = Math.floor((safeTicks % 36_000) / 600);
  const seconds = Math.floor((safeTicks % 600) / 10);
  const tenths = safeTicks % 10;
  const minutePart = String(minutes).padStart(2, "0");
  const secondPart = `${String(seconds).padStart(2, "0")}.${tenths}`;
  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${minutePart}:${secondPart}`
    : `${minutePart}:${secondPart}`;
}

export function parseClipTime(value: string): number | null {
  const parts = value.trim().split(":");
  if (parts.length !== 2 && parts.length !== 3) return null;
  if (!parts.slice(0, -1).every((part) => /^\d+$/.test(part))) return null;
  if (!/^\d+(?:\.\d)?$/.test(parts.at(-1) ?? "")) return null;

  const numbers = parts.map(Number);
  const hours = parts.length === 3 ? numbers[0] : 0;
  const minutes = parts.length === 3 ? numbers[1] : numbers[0];
  const seconds = parts.length === 3 ? numbers[2] : numbers[1];
  if (minutes >= 60 || seconds >= 60) return null;

  return secondsToClipTicks(hours * 3600 + minutes * 60 + seconds);
}

export function initialClipRange(
  currentSeconds: number,
  durationSeconds: number
): ClipRange | null {
  const duration = Math.max(0, secondsToClipTicks(durationSeconds));
  if (duration < MIN_CLIP_TICKS) return null;

  const current = Math.min(Math.max(0, secondsToClipTicks(currentSeconds)), duration);
  const end = Math.min(duration, current + MAX_CLIP_TICKS);
  const start = Math.max(0, end - MAX_CLIP_TICKS);
  return { start, end };
}

export function clipTimelineWindow(
  focusTicks: number,
  durationTicks: number,
  requestedWindowTicks: number
): ClipTimelineWindow {
  const duration = Math.max(MIN_CLIP_TICKS, Math.round(durationTicks));
  const size = Math.min(duration, Math.max(MAX_CLIP_TICKS, Math.round(requestedWindowTicks)));
  const focus = Math.min(duration, Math.max(0, Math.round(focusTicks)));
  const start = Math.min(Math.max(0, focus - Math.floor(size / 2)), duration - size);
  return { start, end: start + size };
}

export function moveClipRange(
  range: ClipRange,
  targetCenterTicks: number,
  durationTicks: number
): ClipRange {
  const duration = Math.max(MIN_CLIP_TICKS, Math.round(durationTicks));
  const length = Math.min(duration, Math.max(MIN_CLIP_TICKS, range.end - range.start));
  const center = Math.min(duration, Math.max(0, Math.round(targetCenterTicks)));
  const start = Math.min(Math.max(0, center - Math.floor(length / 2)), duration - length);
  return { start, end: start + length };
}

export function updateClipRange(
  range: ClipRange,
  changed: "start" | "end",
  nextValue: number,
  durationTicks: number
): ClipRange {
  const duration = Math.max(MIN_CLIP_TICKS, Math.round(durationTicks));
  const value = Math.round(nextValue);

  if (changed === "start") {
    const start = Math.min(Math.max(0, value), Math.max(0, range.end - MIN_CLIP_TICKS));
    return {
      start: Math.max(start, range.end - MAX_CLIP_TICKS),
      end: Math.min(range.end, duration),
    };
  }

  const end = Math.max(Math.min(duration, value), Math.min(duration, range.start + MIN_CLIP_TICKS));
  return {
    start: Math.min(range.start, Math.max(0, duration - MIN_CLIP_TICKS)),
    end: Math.min(end, range.start + MAX_CLIP_TICKS),
  };
}

export function buildCreateClipPayload(input: {
  streamId: number;
  title: string;
  range: ClipRange;
  durationTicks: number;
}): { payload?: CreateClipPayload; error?: string } {
  const title = input.title.trim();
  const length = input.range.end - input.range.start;

  if (!title) return { error: "タイトルを入力してください。" };
  if (title.length > MAX_CLIP_TITLE_LENGTH) {
    return { error: `タイトルは${MAX_CLIP_TITLE_LENGTH}文字以内で入力してください。` };
  }
  if (input.range.start < 0 || input.range.end > input.durationTicks) {
    return { error: "クリップ範囲を動画内に収めてください。" };
  }
  if (length < MIN_CLIP_TICKS || length > MAX_CLIP_TICKS) {
    return { error: "クリップの長さは0.1秒以上60.0秒以内にしてください。" };
  }

  return {
    payload: {
      title,
      source_video_id: input.streamId,
      start_seconds: clipTicksToSeconds(input.range.start),
      end_seconds: clipTicksToSeconds(input.range.end),
    },
  };
}
