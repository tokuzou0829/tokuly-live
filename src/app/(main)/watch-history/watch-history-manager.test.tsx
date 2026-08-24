import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import WatchHistoryManager from "./watch-history-manager";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("WatchHistoryManager", () => {
  it("renders history as a list with an icon-only item delete button", () => {
    render(
      <WatchHistoryManager
        channelId={7}
        token="token"
        title="テストチャンネル の視聴履歴"
        result={{
          data: [
            {
              content_type: "video",
              content_key: "video-key",
              title: "テスト動画",
              thumbnail_url: "https://example.test/video.jpg",
              duration_seconds: 120,
              channel_name: "テストチャンネル",
              channel_handle: "test-channel",
              view_count: 1234,
              resume_position_ms: 30000,
              total_watched_seconds: 30,
              completed: false,
              completed_at: null,
              last_watched_at: "2026-08-24T00:00:00Z",
            },
          ],
          links: {},
          meta: {
            current_page: 1,
            from: 1,
            last_page: 1,
            per_page: 20,
            to: 1,
            total: 1,
          },
        }}
      />
    );

    expect(screen.getByRole("list")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    const deleteButton = screen.getByRole("button", { name: "テスト動画を履歴から削除" });
    expect(deleteButton).toHaveTextContent("");
    expect(screen.queryByText("履歴から削除")).not.toBeInTheDocument();
    expect(screen.getByText("テストチャンネル")).toBeInTheDocument();
    expect(screen.getByText("1,234 回再生")).toBeInTheDocument();
    expect(screen.queryByText("0:30 から再開")).not.toBeInTheDocument();
  });

  it("groups items by friendly watch dates without content type fallback labels", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-25T03:00:00Z"));
    const item = (contentKey: string, lastWatchedAt: string, contentType: "video" | "clip") => ({
      content_type: contentType,
      content_key: contentKey,
      title: `作品 ${contentKey}`,
      thumbnail_url: null,
      duration_seconds: 120,
      channel_name: null,
      channel_handle: null,
      resume_position_ms: 0,
      total_watched_seconds: 30,
      completed: true,
      completed_at: lastWatchedAt,
      last_watched_at: lastWatchedAt,
    });

    render(
      <WatchHistoryManager
        channelId={7}
        token="token"
        title="テストチャンネル の視聴履歴"
        result={{
          data: [
            item("today", "2026-08-25T02:00:00Z", "video"),
            item("yesterday", "2026-08-24T02:00:00Z", "clip"),
            item("this-year", "2026-07-10T02:00:00Z", "video"),
            item("last-year", "2025-12-31T02:00:00Z", "clip"),
          ],
          links: {},
          meta: {
            current_page: 1,
            from: 1,
            last_page: 1,
            per_page: 20,
            to: 4,
            total: 4,
          },
        }}
      />
    );

    expect(screen.getByRole("heading", { name: "今日" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "昨日" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "7月10日" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "2025年12月31日" })).toBeInTheDocument();
    expect(screen.queryByText("動画")).not.toBeInTheDocument();
    expect(screen.queryByText("クリップ")).not.toBeInTheDocument();
  });
});
