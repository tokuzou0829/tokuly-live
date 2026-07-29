import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import Chat from "./chat";

const socket = {
  on: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock("socket.io-client", () => ({
  default: vi.fn(() => socket),
}));

const session = {
  user: {
    name: "Alice",
    access_token: "token",
  },
  expires: "2099-01-01T00:00:00.000Z",
} as Session;

describe("live chat gift availability", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue([]),
      })
    );
  });

  afterEach(() => cleanup());

  it("hides the gift button when gifts are disabled", () => {
    render(<Chat id={146} channelId={5} giftsEnabled={false} session={session} />);
    expect(
      screen.queryByRole("button", { name: "ギフト付きメッセージを送る" })
    ).not.toBeInTheDocument();
  });

  it("shows the gift button when gifts are enabled", () => {
    render(<Chat id={146} channelId={5} giftsEnabled session={session} />);
    expect(screen.getByRole("button", { name: "ギフト付きメッセージを送る" })).toBeInTheDocument();
  });
});
