import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import type { ClipPage } from "@/types/clip";
import StudioClipList from "./studio-clip-list";

const mocks = vi.hoisted(() => ({ remove: vi.fn(), refresh: vi.fn() }));
vi.mock("@/requests/studio", () => ({ deleteStudioClip: mocks.remove }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: mocks.refresh }) }));

const result: ClipPage = {
  data: [
    {
      clip_key: "clip-key",
      creator_channel_id: 10,
      source_video_id: 34,
      title: "管理するクリップ",
      start_seconds: 10,
      end_seconds: 20,
      duration_seconds: 10.4,
      thumbnail_url: "https://example.test/clip.jpg",
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
    },
  ],
  links: {},
  meta: { current_page: 1, from: 1, last_page: 1, per_page: 20, to: 1, total: 1 },
};

describe("StudioClipList", () => {
  it("shows clip context and deletes only after confirmation", async () => {
    mocks.remove.mockResolvedValue(undefined);
    render(<StudioClipList result={result} token="token" deleteChannelId={20} />);

    expect(screen.getAllByText("作成者")).toHaveLength(2);
    expect(screen.getByText("元動画")).toBeInTheDocument();
    expect(screen.getByText("10秒")).toBeInTheDocument();
    expect(screen.queryByText("10.4秒")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "管理するクリップを削除" }));
    expect(screen.getByText(/共有URLのすべてから完全に削除/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "完全に削除" }));

    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith(20, "clip-key", "token"));
    expect(mocks.refresh).toHaveBeenCalled();
  });
});
