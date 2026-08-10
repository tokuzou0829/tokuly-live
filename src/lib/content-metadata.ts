import type { Metadata } from "next";
import type { Live } from "@/types/live";

const SITE_URL = "https://live.tokuly.com";

export type ContentKind = "live" | "video";

export function contentOgImageUrl(streamName: string): string {
  return `${SITE_URL}/api/og/video/${encodeURIComponent(streamName)}/image.jpg`;
}

export function buildContentMetadata(live: Live, kind: ContentKind): Metadata {
  const pageUrl = `${SITE_URL}/${kind}/${encodeURIComponent(live.stream_name)}`;
  const imageUrl = contentOgImageUrl(live.stream_name);

  return {
    title: live.title,
    description: live.stream_overview,
    keywords: ["ライブ配信"],
    alternates: { canonical: pageUrl },
    twitter: {
      card: "summary_large_image",
      title: live.title,
      description: live.stream_overview,
      images: [imageUrl],
    },
    openGraph: {
      title: live.title,
      description: live.stream_overview,
      url: pageUrl,
      siteName: "Tokuly Live",
      type: "video.other",
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          type: "image/jpeg",
          alt: live.title,
        },
      ],
    },
  };
}
