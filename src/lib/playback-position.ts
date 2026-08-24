export function parsePlaybackStartTime(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export function resolvePlaybackStartTime(
  explicitValue: string | null | undefined,
  resumePositionMs: number | null = null
): number | null {
  const explicitTime = parsePlaybackStartTime(explicitValue);
  if (explicitTime !== null) return explicitTime;
  if (resumePositionMs === null || !Number.isFinite(resumePositionMs)) return null;
  return Math.max(0, resumePositionMs) / 1000;
}
