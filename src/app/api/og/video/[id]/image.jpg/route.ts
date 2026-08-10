import { NextRequest } from "next/server";
import {
  CONTENT_OG_CACHE_CONTROL,
  CONTENT_OG_SOURCE_TIMEOUT_MS,
  fetchOgImageSource,
  OgImageSourceError,
  renderContentOgImage,
} from "@/lib/content-og-image";
import { fetchLive } from "@/requests/live";
import { FetchError } from "@/utils/custom-errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CACHE_HEADERS = {
  "Cache-Control": CONTENT_OG_CACHE_CONTROL,
  "CDN-Cache-Control": CONTENT_OG_CACHE_CONTROL,
  "Vercel-CDN-Cache-Control": CONTENT_OG_CACHE_CONTROL,
};

function errorResponse(message: string, status: number): Response {
  return new Response(message, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<Response> {
  let live;
  try {
    live = await fetchLive(
      { id: params.id },
      { signal: AbortSignal.timeout(CONTENT_OG_SOURCE_TIMEOUT_MS) }
    );
  } catch (error) {
    if (error instanceof FetchError && error.status === 404) {
      return errorResponse("コンテンツが見つかりません", 404);
    }
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      return errorResponse("コンテンツ情報の取得がタイムアウトしました", 504);
    }
    return errorResponse("コンテンツ情報を取得できませんでした", 502);
  }

  try {
    const source = await fetchOgImageSource(live.static_thumbnail_url);
    const image = await renderContentOgImage(source);

    return new Response(new Uint8Array(image), {
      status: 200,
      headers: {
        ...CACHE_HEADERS,
        "Content-Type": "image/jpeg",
        "Content-Length": image.byteLength.toString(),
      },
    });
  } catch (error) {
    if (error instanceof OgImageSourceError) {
      return errorResponse(error.message, error.status);
    }
    return errorResponse("OG画像を生成できませんでした", 502);
  }
}
