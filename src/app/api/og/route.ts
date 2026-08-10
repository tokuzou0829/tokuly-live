import { NextRequest, NextResponse } from "next/server";
import { contentOgImageUrl } from "@/lib/content-metadata";

export const runtime = "edge";

export function GET(req: NextRequest): Response {
  const videoId = req.nextUrl.searchParams.get("video_id");

  if (!videoId) {
    return new Response("video_id is required", {
      status: 400,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const response = NextResponse.redirect(contentOgImageUrl(videoId), 308);
  response.headers.set("Cache-Control", "public, max-age=3600");
  return response;
}
