import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StudioStream } from "@/types/studio";
import StreamEditor from "./stream-editor";

const navigation = vi.hoisted(() => ({ refresh: vi.fn() }));
const writeText = vi.fn().mockResolvedValue(undefined);

vi.mock("next/navigation", () => ({ useRouter: () => navigation }));

const stream = {
  id: 12,
  channel_id: 7,
  type: "live",
  title: "テスト配信",
  overview: null,
  genre: null,
  publishing_setting: "public",
  live_thumbnail: false,
  gifts_enabled: false,
  game: null,
  thumbnail_url: null,
  stream_key_secret: "secret-stream-key",
  urls: {
    browser_encoder: "https://example.test/encoder",
    public: "https://example.test/live",
  },
} as StudioStream;

describe("StreamEditor streaming credentials", () => {
  beforeEach(() => {
    writeText.mockResolvedValue(undefined);
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    );
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("hides the stream key by default, reveals it on demand, and copies it while hidden", async () => {
    render(<StreamEditor stream={stream} token="token" />);

    expect(screen.getByLabelText("配信URL")).toHaveValue("rtmp://rtmp.live.tokuly.com/live2");
    const streamKey = screen.getByLabelText("ストリームキー");
    expect(streamKey).toHaveAttribute("type", "password");

    fireEvent.click(screen.getByRole("button", { name: "ストリームキーをコピー" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith("secret-stream-key"));

    fireEvent.click(screen.getByRole("button", { name: "ストリームキーを表示" }));
    expect(streamKey).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "ストリームキーを隠す" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("treats an ended live stream as archived content without streaming controls", () => {
    render(<StreamEditor stream={{ ...stream, status: "end" }} token="token" />);

    expect(screen.queryByRole("heading", { name: "配信方法" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("配信URL")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("ストリームキー")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "コンテンツ設定" })).toBeInTheDocument();
  });
});
