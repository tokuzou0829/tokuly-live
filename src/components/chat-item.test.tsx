import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChatItemView } from "./chat-item";

describe("ChatItemView", () => {
  it("renders an ordinary chat message", () => {
    const { container } = render(
      <ChatItemView item={{ type: "chat", id: 1, name: "Alice", text: "こんにちは" }} />
    );
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("こんにちは")).toBeInTheDocument();
    expect(container.querySelector(".chat-message-content")).toBeInTheDocument();
    expect(container.querySelector(".chat-avatar")).toHaveTextContent("A");
    expect(container.querySelector(".chat-avatar")).toHaveStyle({
      width: "var(--chat-avatar-size)",
      height: "var(--chat-avatar-size)",
      flexBasis: "var(--chat-avatar-size)",
    });
    expect(container.querySelector(".chat-message-name")).toHaveTextContent("Alice");
    expect(container.querySelector(".chat-message-text")).toHaveTextContent("こんにちは");
  });

  it("renders a supplied avatar and allows long content to wrap", () => {
    const { container } = render(
      <ChatItemView
        item={{
          type: "chat",
          id: 2,
          image: "https://example.test/alice.jpg",
          name: "とても長いチャンネル名です",
          text: "長い日本語のメッセージが狭いチャットでも折り返されます",
        }}
      />
    );

    expect(container.querySelector(".chat-avatar")).toBeInTheDocument();
    expect(container.querySelector(".chat-avatar-fallback")).toHaveTextContent("と");
    expect(container.querySelector(".chat-message-content")).toBeInTheDocument();
  });

  it.each([
    "blue",
    "cyan",
    "light-green",
    "yellow",
    "orange",
    "magenta",
    "red",
    "black",
    "rainbow",
  ] as const)("renders a %s gift", (displayStyle) => {
    render(
      <ChatItemView
        item={{
          type: "gift",
          id: displayStyle,
          name: "Alice",
          text: "応援しています",
          amount: 1000,
          provider: "amazon",
          display_style: displayStyle,
          completed_at: "2026-07-29T00:00:00Z",
        }}
      />
    );
    expect(screen.getByTestId(`gift-message-${displayStyle}`)).toHaveTextContent("￥1,000");
    expect(screen.getByTestId(`gift-message-${displayStyle}`)).toHaveClass(
      "chat-message",
      "chat-gift-message"
    );
    expect(
      screen.getByTestId(`gift-message-${displayStyle}`).querySelector(".chat-gift-amount")
    ).toHaveTextContent("￥1,000");
  });
});
