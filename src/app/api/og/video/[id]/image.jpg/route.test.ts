import sharp from "sharp";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Live } from "@/types/live";

const { fetchLive } = vi.hoisted(() => ({ fetchLive: vi.fn() }));
vi.mock("@/requests/live", () => ({ fetchLive }));

import { CONTENT_OG_CACHE_CONTROL } from "@/lib/content-og-image";
import { GET } from "./route";

const live = {
  stream_name: "stream-id",
  static_thumbnail_url: "https://assets.example.test/thumbnail.png",
} as Live;

let sourceImage: Buffer;

describe("content OG image route", () => {
  beforeAll(async () => {
    sourceImage = await sharp({
      create: { width: 1_920, height: 1_080, channels: 3, background: "#123456" },
    })
      .png()
      .toBuffer();
  });

  beforeEach(() => {
    fetchLive.mockResolvedValue(live);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(new Uint8Array(sourceImage), {
          status: 200,
          headers: { "Content-Type": "image/png" },
        })
      )
    );
  });

  it("returns a cached 1200x630 JPEG", async () => {
    const response = await GET({} as never, { params: { id: "stream-id" } });
    const image = Buffer.from(await response.arrayBuffer());
    const metadata = await sharp(image).metadata();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("cache-control")).toBe(CONTENT_OG_CACHE_CONTROL);
    expect(response.headers.get("cdn-cache-control")).toBe(CONTENT_OG_CACHE_CONTROL);
    expect(response.headers.get("vercel-cdn-cache-control")).toBe(CONTENT_OG_CACHE_CONTROL);
    expect(Number(response.headers.get("content-length"))).toBe(image.byteLength);
    expect(metadata).toMatchObject({ format: "jpeg", width: 1200, height: 630 });
    expect(fetchLive).toHaveBeenCalledWith(
      { id: "stream-id" },
      { signal: expect.any(AbortSignal) }
    );
  });

  it("returns 404 when the content API cannot find the stream", async () => {
    const { FetchError } = await import("@/utils/custom-errors");
    fetchLive.mockRejectedValue(new FetchError("not found", { status: 404 }));

    const response = await GET({} as never, { params: { id: "missing" } });

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns 502 when the thumbnail origin responds with an error", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 404 }));

    const response = await GET({} as never, { params: { id: "stream-id" } });

    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns 502 when the thumbnail response is not an image", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response("not an image", { headers: { "Content-Type": "text/html" } })
    );

    const response = await GET({} as never, { params: { id: "stream-id" } });

    expect(response.status).toBe(502);
  });

  it("returns 504 when the thumbnail request times out", async () => {
    const timeout = new Error("timed out");
    timeout.name = "TimeoutError";
    vi.mocked(fetch).mockRejectedValue(timeout);

    const response = await GET({} as never, { params: { id: "stream-id" } });

    expect(response.status).toBe(504);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
