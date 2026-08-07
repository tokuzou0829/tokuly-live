import React from "react";
import { readFileSync } from "node:fs";
import path from "node:path";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Chat from "./chat";

const socket = {
  on: vi.fn((event: string, handler: () => void) => {
    if (event === "connect") handler();
  }),
  emit: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock("socket.io-client", () => ({
  default: vi.fn(() => socket),
}));

describe("embedded chat customization contract", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi
          .fn()
          .mockResolvedValue([{ id: 1, type: "chat", name: "Alice", text: "こんにちは" }]),
      })
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("keeps legacy selectors and exposes the new element hooks", async () => {
    const { container } = render(<Chat id={146} session={null} />);

    await waitFor(() => expect(screen.getByText("こんにちは")).toBeInTheDocument());
    await waitFor(() => expect(container.querySelector(".chat-status")).toBeInTheDocument());

    [
      ".chat-body",
      ".chat-label",
      ".chat-message-box",
      ".chat-message",
      ".chat-message-name",
      ".chat-message-text",
      ".chat-status",
      ".chat-input",
      ".chat-avatar",
      ".chat-message-content",
      ".chat-login-message",
    ].forEach((selector) =>
      expect(container.querySelector(selector), selector).toBeInTheDocument()
    );
  });

  it("defines every documented chat theme variable", () => {
    const css = readFileSync(path.join(process.cwd(), "src/app/globals.css"), "utf8");

    [
      "--chat-background",
      "--chat-surface",
      "--chat-text",
      "--chat-muted-text",
      "--chat-border",
      "--chat-hover",
      "--chat-input-background",
      "--chat-accent",
      "--chat-radius",
      "--chat-avatar-size",
      "--chat-message-gap",
      "--chat-message-padding",
    ].forEach((variable) => expect(css, variable).toContain(variable));
  });
});
