import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ContentCard } from "@/components/ui/content-card";
import { MoreVideoItem } from "@/components/moreVideoItem";
import type { MoreVideoList } from "@/types/live";

const relatedVideo: MoreVideoList = {
  id: 1,
  title: "テスト動画",
  status: "video",
  stream_name: "test-video",
  thumbnail_url: "https://example.test/thumbnail.jpg",
  type: "video",
  static_thumbnail_url: "https://example.test/static-thumbnail.jpg",
  stream_overview: "",
  stream_start_time: "",
  publishing_setting: "public",
  ch_name: "テストチャンネル",
  ch_icon: "https://example.test/icon.jpg",
  ch_handle: "test-channel",
  duration_seconds: 65,
  like_count: 0,
  dislike_count: 0,
};

describe("video duration badges", () => {
  afterEach(cleanup);

  it("shows the duration on a content card", () => {
    render(
      <ContentCard
        href="/video/test-video"
        title="テスト動画"
        thumbnailUrl="https://example.test/thumbnail.jpg"
        channelName="テストチャンネル"
        channelIcon="https://example.test/icon.jpg"
        durationSeconds={3600}
      />
    );

    expect(screen.getByLabelText("動画の長さ 01:00:00")).toBeInTheDocument();
  });

  it("does not show a duration when it is unavailable", () => {
    render(
      <ContentCard
        href="/video/test-video"
        title="テスト動画"
        thumbnailUrl="https://example.test/thumbnail.jpg"
        channelName="テストチャンネル"
        channelIcon="https://example.test/icon.jpg"
        durationSeconds={null}
      />
    );

    expect(screen.queryByLabelText(/動画の長さ/)).not.toBeInTheDocument();
  });

  it("shows the duration on a related video", () => {
    render(<MoreVideoItem video={relatedVideo} />);

    expect(screen.getByLabelText("動画の長さ 01:05")).toBeInTheDocument();
  });

  it("does not show a duration on a live related item", () => {
    render(<MoreVideoItem video={{ ...relatedVideo, type: "live" }} />);

    expect(screen.queryByLabelText(/動画の長さ/)).not.toBeInTheDocument();
  });

  it("shows the concurrent viewer count on a live card", () => {
    render(
      <ContentCard
        href="/live/test-live"
        title="テストライブ"
        thumbnailUrl="https://example.test/thumbnail.jpg"
        channelName="テストチャンネル"
        channelIcon="https://example.test/icon.jpg"
        viewerCount={1234}
        variant="live"
      />
    );

    expect(screen.getByLabelText("同時視聴者数 1234人")).toHaveTextContent("1,234人が視聴中");
  });

  it("shows zero viewers when no snapshot has been recorded", () => {
    render(
      <ContentCard
        href="/live/test-live"
        title="テストライブ"
        thumbnailUrl="https://example.test/thumbnail.jpg"
        channelName="テストチャンネル"
        channelIcon="https://example.test/icon.jpg"
        viewerCount={0}
        variant="live"
      />
    );

    expect(screen.getByLabelText("同時視聴者数 0人")).toHaveTextContent("0人が視聴中");
  });
});
