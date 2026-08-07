import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GiftDisplayStyle } from "@/types/gift";
import SampleChat, { CHAT_TEST_ITEMS } from "./sample-chat";

afterEach(() => cleanup());

describe("chat CSS test preview", () => {
  it("covers every gift style and representative normal messages", () => {
    const giftStyles = CHAT_TEST_ITEMS.filter((item) => item.type === "gift").map(
      (item) => item.display_style
    );
    const expectedStyles: GiftDisplayStyle[] = [
      "blue",
      "cyan",
      "light-green",
      "yellow",
      "orange",
      "magenta",
      "red",
      "black",
      "rainbow",
    ];
    const normalMessages = CHAT_TEST_ITEMS.filter((item) => item.type === "chat");

    expect(giftStyles).toEqual(expectedStyles);
    expect(normalMessages.length).toBeGreaterThanOrEqual(8);
    expect(normalMessages.some((item) => item.text.length > 100)).toBe(true);
    expect(normalMessages.some((item) => item.text.includes("\n"))).toBe(true);
    expect(normalMessages.some((item) => item.image)).toBe(true);
    expect(normalMessages.some((item) => !item.image)).toBe(true);
  });

  it("flows samples and switches the composer action", () => {
    vi.useFakeTimers();
    render(<SampleChat />);

    expect(screen.getByPlaceholderText("チャット")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "ギフト付きメッセージの表示サンプル" })
    ).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(300));
    expect(screen.getByText("こんにちは！")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("チャット"), {
      target: { value: "手動テスト" },
    });
    expect(screen.queryByRole("button", { name: /ギフト付き/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "チャットを送信" })).toBeInTheDocument();

    vi.useRealTimers();
  });

  it("accepts preview CSS only from the same-origin parent", () => {
    render(<SampleChat />);

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: window.location.origin,
          source: window,
          data: {
            type: "tokuly:chat-css:update",
            version: 1,
            css: ".chat-body { background: hotpink; }",
          },
        })
      );
    });
    expect(document.querySelector("#tokuly-chat-preview-style")).toHaveTextContent("hotpink");

    act(() => {
      window.dispatchEvent(
        new MessageEvent("message", {
          origin: "https://example.test",
          source: window,
          data: {
            type: "tokuly:chat-css:update",
            version: 1,
            css: ".chat-body { background: red; }",
          },
        })
      );
    });
    expect(document.querySelector("#tokuly-chat-preview-style")).not.toHaveTextContent("red");
  });
});
