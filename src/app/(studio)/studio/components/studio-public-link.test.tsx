import type { StudioStream } from "@/types/studio";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import StudioPublicLink, { getStudioPublicUrl } from "./studio-public-link";

const writeText = vi.fn();

function stream(overrides: Partial<StudioStream> = {}) {
  return {
    id: 12,
    channel_id: 7,
    type: "live",
    status: "online",
    stream_key: "stream key",
    title: "テストコンテンツ",
    urls: {
      public: "https://example.test/live/wrong-key",
      chat_embed: "https://example.test/chat/stream-key",
      browser_encoder: "https://example.test/encoder",
    },
    ...overrides,
  } as StudioStream;
}

describe("StudioPublicLink", () => {
  beforeEach(() => {
    writeText.mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("配信中のライブにはlive URLを使用する", () => {
    expect(getStudioPublicUrl(stream())).toBe("https://example.test/live/stream%20key");
  });

  it.each([
    ["動画", stream({ type: "video", status: "video" })],
    ["終了済み配信", stream({ type: "live", status: "end" })],
  ])("%sにはvideo URLを使用する", (_label, value) => {
    expect(getStudioPublicUrl(value)).toBe("https://example.test/video/stream%20key");
  });

  it("詳細管理画面用の公開URLをコンパクトな別タブリンクとして表示する", () => {
    const value = stream({ type: "video", status: "video" });
    render(<StudioPublicLink stream={value} />);

    expect(screen.getByText("共有リンク")).toBeInTheDocument();
    expect(screen.getByText("https://example.test/video/stream%20key")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "公開ページを開く" })).toHaveAttribute(
      "href",
      "https://example.test/video/stream%20key"
    );
    expect(screen.getByRole("link", { name: "公開ページを開く" })).toHaveAttribute(
      "target",
      "_blank"
    );
  });

  it("公開URLをコピーして成功を通知する", async () => {
    render(<StudioPublicLink stream={stream()} />);

    fireEvent.click(screen.getByRole("button", { name: "共有公開リンクをコピー" }));

    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("https://example.test/live/stream%20key")
    );
    expect(await screen.findByText("共有公開リンクをコピーしました。")).toBeInTheDocument();
  });

  it("コピーできない場合はエラーを通知する", async () => {
    writeText.mockRejectedValue(new Error("denied"));
    Object.defineProperty(document, "execCommand", {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    });
    render(<StudioPublicLink stream={stream()} />);

    fireEvent.click(screen.getByRole("button", { name: "共有公開リンクをコピー" }));

    expect(await screen.findByText("共有公開リンクをコピーできませんでした。")).toBeInTheDocument();
  });
});
