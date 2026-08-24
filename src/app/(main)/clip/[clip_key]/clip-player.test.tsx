import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClipResource } from "@/types/clip";
import ClipPlayer from "./clip-player";

const playerProps = vi.hoisted(() => vi.fn());

vi.mock("@/app/(main)/video/[id]/player", () => ({
  default: (props: Record<string, unknown>) => {
    playerProps(props);
    return <div>player</div>;
  },
}));

afterEach(() => {
  cleanup();
  playerProps.mockClear();
});

describe("ClipPlayer", () => {
  it("shows an optimistic view count immediately and keeps it detached from playback updates", () => {
    const clip = {
      clip_key: "clip-key",
      creator_channel_id: 1,
      source_video_id: 2,
      title: "テストクリップ",
      start_seconds: 10,
      end_seconds: 20,
      duration_seconds: 10,
      thumbnail_url: "https://example.test/clip.jpg",
      creator_channel: null,
      source_video: {
        id: 2,
        title: "元動画",
        stream_key: "stream-key",
        type: "video",
        thumbnail_url: null,
      },
      source_channel: null,
      created_at: "2026-08-25T00:00:00Z",
      view_count: 12,
    } satisfies ClipResource;

    render(<ClipPlayer clip={clip} />);

    expect(screen.getByText("13 回再生")).toBeInTheDocument();
    expect(playerProps).toHaveBeenCalledWith(
      expect.not.objectContaining({ onViewCountChange: expect.anything() })
    );
  });
});
