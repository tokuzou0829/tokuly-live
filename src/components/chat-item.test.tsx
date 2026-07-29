import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChatItemView } from "./chat-item";

describe("ChatItemView", () => {
  it("renders an ordinary chat message", () => {
    render(<ChatItemView item={{ type: "chat", id: 1, name: "Alice", text: "こんにちは" }} />);
    expect(screen.getByText("Alice")).toBeInTheDocument();
    expect(screen.getByText("こんにちは")).toBeInTheDocument();
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
  });
});
