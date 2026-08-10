import { describe, expect, it } from "vitest";
import type { Live } from "@/types/live";
import { buildContentMetadata } from "./content-metadata";

const live = {
  title: "テスト動画",
  stream_name: "stream id",
  stream_overview: "動画の説明",
} as Live;

describe("content metadata", () => {
  it.each([
    ["live", "https://live.tokuly.com/live/stream%20id"],
    ["video", "https://live.tokuly.com/video/stream%20id"],
  ] as const)("creates %s metadata with its correct canonical URL", (kind, pageUrl) => {
    const metadata = buildContentMetadata(live, kind);
    const openGraph = metadata.openGraph as NonNullable<typeof metadata.openGraph> & {
      images: Array<{ url: string; width: number; height: number; type: string }>;
    };

    expect(metadata).toMatchObject({
      title: "テスト動画",
      description: "動画の説明",
      alternates: { canonical: pageUrl },
      twitter: {
        card: "summary_large_image",
        images: ["https://live.tokuly.com/api/og/video/stream%20id/image.jpg"],
      },
    });
    expect(openGraph.url).toBe(pageUrl);
    expect(openGraph.images[0]).toEqual(
      expect.objectContaining({
        url: "https://live.tokuly.com/api/og/video/stream%20id/image.jpg",
        width: 1200,
        height: 630,
        type: "image/jpeg",
      })
    );
  });
});
