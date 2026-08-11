import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import type { ClipPage, ClipResource } from "@/types/clip";
import VideoClipsSection from "./video-clips-section";

const clip = (index: number): ClipResource => ({
  clip_key: `clip-${index}`,
  creator_channel_id: 10,
  source_video_id: 34,
  title: `クリップ${index}`,
  start_seconds: 10,
  end_seconds: 20,
  duration_seconds: 10,
  thumbnail_url: `https://example.test/${index}.jpg`,
  creator_channel: { id: 10, name: "作成者", handle: "creator", icon_url: null },
  source_video: {
    id: 34,
    title: "元動画",
    stream_key: "video-key",
    type: "video",
    thumbnail_url: null,
  },
  source_channel: { id: 20, name: "元チャンネル", handle: "source", icon_url: null },
  created_at: "2026-08-11T12:00:00+09:00",
});

const page = (count: number): ClipPage => ({
  data: Array.from({ length: count }, (_, index) => clip(index + 1)),
  links: {},
  meta: {
    current_page: 1,
    from: count ? 1 : null,
    last_page: 1,
    per_page: 6,
    to: count || null,
    total: count,
  },
});

describe("VideoClipsSection", () => {
  it("does not render the section when there are no clips", () => {
    const { container } = render(<VideoClipsSection streamName="video-key" result={page(0)} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows at most six compact clips and links to the full list", () => {
    render(<VideoClipsSection streamName="video-key" result={page(7)} />);
    expect(screen.getByText("クリップ1")).toBeInTheDocument();
    expect(screen.getByText("クリップ6")).toBeInTheDocument();
    expect(screen.queryByText("クリップ7")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "すべて見る" })).toHaveAttribute(
      "href",
      "/video/video-key/clips"
    );
  });

  it("shows a non-blocking load error", () => {
    render(<VideoClipsSection streamName="video-key" result={null} />);
    expect(screen.getByText("クリップを読み込めませんでした。")).toBeInTheDocument();
  });
});
