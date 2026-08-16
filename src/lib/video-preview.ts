export type VideoPreviewManifest = {
  version: 1;
  intervalSeconds: number;
  frameCount: number;
  tileWidth: number;
  tileHeight: number;
  columns: number;
  rows: number;
  sprites: string[];
};

export type VideoPreviewFrame = {
  imageUrl: string;
  x: number;
  y: number;
  sheetWidth: number;
  sheetHeight: number;
};

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

export function parseVideoPreviewManifest(
  value: unknown,
  manifestUrl: string
): VideoPreviewManifest | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (
    candidate.version !== 1 ||
    typeof candidate.intervalSeconds !== "number" ||
    !Number.isFinite(candidate.intervalSeconds) ||
    candidate.intervalSeconds <= 0 ||
    !isPositiveInteger(candidate.frameCount) ||
    !isPositiveInteger(candidate.tileWidth) ||
    !isPositiveInteger(candidate.tileHeight) ||
    !isPositiveInteger(candidate.columns) ||
    !isPositiveInteger(candidate.rows) ||
    !Array.isArray(candidate.sprites) ||
    candidate.sprites.length === 0 ||
    candidate.sprites.some((sprite) => typeof sprite !== "string" || !sprite.trim())
  ) {
    return null;
  }

  const capacity = candidate.columns * candidate.rows * candidate.sprites.length;
  if (candidate.frameCount > capacity) return null;

  try {
    return {
      version: 1,
      intervalSeconds: candidate.intervalSeconds,
      frameCount: candidate.frameCount,
      tileWidth: candidate.tileWidth,
      tileHeight: candidate.tileHeight,
      columns: candidate.columns,
      rows: candidate.rows,
      sprites: candidate.sprites.map((sprite) => new URL(sprite, manifestUrl).toString()),
    };
  } catch {
    return null;
  }
}

export function videoPreviewFrameAt(
  manifest: VideoPreviewManifest,
  timeSeconds: number
): VideoPreviewFrame | null {
  if (!Number.isFinite(timeSeconds)) return null;
  const frameIndex = Math.min(
    manifest.frameCount - 1,
    Math.max(0, Math.floor(timeSeconds / manifest.intervalSeconds))
  );
  const spriteCapacity = manifest.columns * manifest.rows;
  const spriteIndex = Math.floor(frameIndex / spriteCapacity);
  const tileIndex = frameIndex % spriteCapacity;
  const column = tileIndex % manifest.columns;
  const row = Math.floor(tileIndex / manifest.columns);
  const imageUrl = manifest.sprites[spriteIndex];
  if (!imageUrl) return null;

  return {
    imageUrl,
    x: column === 0 ? 0 : -column * manifest.tileWidth,
    y: row === 0 ? 0 : -row * manifest.tileHeight,
    sheetWidth: manifest.columns * manifest.tileWidth,
    sheetHeight: manifest.rows * manifest.tileHeight,
  };
}

export function legacyVideoPreviewFrameAt(
  previewBaseUrl: string,
  timeSeconds: number
): VideoPreviewFrame | null {
  if (!Number.isFinite(timeSeconds)) return null;
  const frameIndex = Math.max(0, Math.floor(timeSeconds / 5));
  const spriteIndex = Math.floor(frameIndex / 25) + 1;
  const tileIndex = frameIndex % 25;
  const column = tileIndex % 5;
  const row = Math.floor(tileIndex / 5);

  return {
    imageUrl: `${previewBaseUrl}${String(spriteIndex).padStart(3, "0")}.jpg`,
    x: column === 0 ? 0 : -column * 160,
    y: row === 0 ? 0 : -row * 90,
    sheetWidth: 800,
    sheetHeight: 450,
  };
}
