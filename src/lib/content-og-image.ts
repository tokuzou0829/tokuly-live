import sharp from "sharp";

export const CONTENT_OG_WIDTH = 1200;
export const CONTENT_OG_HEIGHT = 630;
export const CONTENT_OG_QUALITY = 82;
export const CONTENT_OG_SOURCE_TIMEOUT_MS = 5_000;
export const CONTENT_OG_CACHE_CONTROL = "public, max-age=3600, stale-while-revalidate=86400";

export class OgImageSourceError extends Error {
  constructor(
    message: string,
    readonly status: 502 | 504
  ) {
    super(message);
    this.name = "OgImageSourceError";
  }
}

export async function fetchOgImageSource(
  sourceUrl: string,
  signal: AbortSignal = AbortSignal.timeout(CONTENT_OG_SOURCE_TIMEOUT_MS)
): Promise<Buffer> {
  let url: URL;
  try {
    url = new URL(sourceUrl);
  } catch {
    throw new OgImageSourceError("サムネイルURLが不正です", 502);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new OgImageSourceError("サムネイルURLが不正です", 502);
  }

  try {
    const response = await fetch(url, {
      headers: { Accept: "image/*" },
      signal,
    });

    if (!response.ok) {
      throw new OgImageSourceError("サムネイルを取得できませんでした", 502);
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.startsWith("image/")) {
      throw new OgImageSourceError("サムネイルが画像ではありません", 502);
    }

    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    if (error instanceof OgImageSourceError) throw error;
    if (signal.aborted || (error instanceof Error && error.name === "TimeoutError")) {
      throw new OgImageSourceError("サムネイルの取得がタイムアウトしました", 504);
    }
    throw new OgImageSourceError("サムネイルを取得できませんでした", 502);
  }
}

export async function renderContentOgImage(source: Buffer): Promise<Buffer> {
  return await sharp(source)
    .rotate()
    .resize(CONTENT_OG_WIDTH, CONTENT_OG_HEIGHT, {
      fit: "cover",
      position: "centre",
    })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality: CONTENT_OG_QUALITY })
    .toBuffer();
}
