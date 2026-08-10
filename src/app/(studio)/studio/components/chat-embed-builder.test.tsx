import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StudioStream } from "@/types/studio";
import ChatEmbedBuilder from "./chat-embed-builder";
import { CHAT_CSS_MAX_LENGTH, CHAT_CSS_PRESETS } from "./chat-embed-presets";

const streams = [
  {
    id: 10,
    title: "朝のライブ配信",
    status: "online",
    thumbnail_url: "https://example.test/live.jpg",
    urls: {
      public: "https://example.test/live/stream-key",
      chat_embed: "https://example.test/chat/stream-key",
      browser_encoder: "https://example.test/encoder",
    },
  },
  {
    id: 11,
    title:
      "次回の配信タイトルが非常に長く空白のない文字列でもレイアウトからはみ出さずに表示できることを確認するためのライブ配信",
    status: "offline",
    thumbnail_url: null,
    urls: {
      public: "https://example.test/live/next-key",
      chat_embed: "https://example.test/chat/next-key",
      browser_encoder: "https://example.test/encoder/next-key",
    },
  },
] as StudioStream[];

const writeText = vi.fn().mockResolvedValue(undefined);

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe("ChatEmbedBuilder", () => {
  it("starts without a stream and handles an empty stream list", () => {
    const { rerender } = render(<ChatEmbedBuilder streams={streams} />);

    expect(screen.getByPlaceholderText("配信を選択するとURLが表示されます")).toHaveValue("");
    expect(screen.getByRole("button", { name: "配信を選択" })).toBeEnabled();

    rerender(<ChatEmbedBuilder streams={[]} />);
    expect(screen.getByRole("button", { name: "選択できる配信がありません" })).toBeDisabled();
  });

  it("selects a stream and copies its OBS browser URL", async () => {
    render(<ChatEmbedBuilder streams={streams} />);

    fireEvent.click(screen.getByRole("button", { name: "配信を選択" }));
    fireEvent.click(await screen.findByRole("button", { name: /朝のライブ配信/ }));

    expect(screen.getByDisplayValue("https://example.test/chat/stream-key")).toBeInTheDocument();
    expect(screen.getByText("配信中")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "配信を変更" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "URLをコピー" }));
    await waitFor(() =>
      expect(writeText).toHaveBeenCalledWith("https://example.test/chat/stream-key")
    );
    expect(await screen.findByText("URLをコピーしました。")).toBeInTheDocument();
  });

  it("switches presets, clears the active preset on edit, and copies CSS", async () => {
    render(<ChatEmbedBuilder streams={streams} />);
    const editor = screen.getByLabelText("チャットのカスタムCSS");

    expect(screen.getByRole("button", { name: /^吹き出し/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    fireEvent.click(screen.getByRole("button", { name: /^シンプルホワイト/ }));
    expect(editor).toHaveValue(CHAT_CSS_PRESETS.simple.css);
    expect(screen.getByRole("button", { name: /^シンプルホワイト/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    fireEvent.change(editor, { target: { value: ".chat-body { color: red; }" } });
    expect(screen.getByRole("button", { name: /^シンプルホワイト/ })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(editor).toHaveAttribute("maxlength", String(CHAT_CSS_MAX_LENGTH));
    expect(
      screen.getByText(`26 / ${CHAT_CSS_MAX_LENGTH.toLocaleString("ja-JP")}`)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "CSSをコピー" }));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(".chat-body { color: red; }"));
    expect(screen.getByRole("button", { name: "コピー済み" })).toBeInTheDocument();
  });

  it("searches streams and constrains long titles", async () => {
    render(<ChatEmbedBuilder streams={streams} />);

    fireEvent.click(screen.getByRole("button", { name: "配信を選択" }));
    const longTitle = streams[1].title;
    const longTitleElement = await screen.findByText(longTitle);

    expect(longTitleElement).toHaveClass("line-clamp-2", "[overflow-wrap:anywhere]");
    expect(longTitleElement.parentElement).toHaveClass("min-w-0", "overflow-hidden");

    fireEvent.change(screen.getByPlaceholderText("配信名で検索"), {
      target: { value: "一致しない名前" },
    });
    expect(screen.getByText("一致する配信がありません")).toBeInTheDocument();
    expect(screen.queryByText(longTitle)).not.toBeInTheDocument();
  });

  it("sends edited CSS on a debounce, iframe load, and a valid ready message", () => {
    vi.useFakeTimers();
    render(<ChatEmbedBuilder streams={streams} />);
    const iframe = screen.getByTitle("チャットCSSプレビュー") as HTMLIFrameElement;
    const postMessage = vi.spyOn(iframe.contentWindow!, "postMessage");

    fireEvent.change(screen.getByLabelText("チャットのカスタムCSS"), {
      target: { value: ".chat-body { background: lime; }" },
    });
    act(() => vi.advanceTimersByTime(99));
    expect(postMessage).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(postMessage).toHaveBeenCalledWith(
      {
        type: "tokuly:chat-css:update",
        version: 1,
        css: ".chat-body { background: lime; }",
      },
      window.location.origin
    );

    postMessage.mockClear();
    fireEvent.load(iframe);
    expect(postMessage).toHaveBeenCalledTimes(1);

    postMessage.mockClear();
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          source: iframe.contentWindow,
          data: { type: "tokuly:chat-css:ready", version: 1 },
        })
      );
    });
    expect(postMessage).toHaveBeenCalledTimes(1);

    postMessage.mockClear();
    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://example.test",
          source: iframe.contentWindow,
          data: { type: "tokuly:chat-css:ready", version: 1 },
        })
      );
    });
    expect(postMessage).not.toHaveBeenCalled();
  });
});
