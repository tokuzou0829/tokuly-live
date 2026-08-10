import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { GET } from "./route";

describe("legacy content OG image route", () => {
  it("permanently redirects an existing video_id to the cacheable JPEG route", () => {
    const response = GET(new NextRequest("https://live.tokuly.com/api/og?video_id=stream%20id"));

    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      "https://live.tokuly.com/api/og/video/stream%20id/image.jpg"
    );
    expect(response.headers.get("cache-control")).toBe("public, max-age=3600");
  });

  it("rejects requests without a video_id", async () => {
    const response = GET(new NextRequest("https://live.tokuly.com/api/og"));

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
