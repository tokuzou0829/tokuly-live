import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StudioChannel } from "@/types/studio";
import StudioShell from "./studio-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/studio",
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("next-auth/react", () => ({ signOut: vi.fn() }));
vi.mock("./actions", () => ({
  selectStudioChannel: "/studio",
  activateStudioChannel: vi.fn(),
}));
vi.mock("./components/studio-create-menu", () => ({ default: () => <div>コンテンツ作成</div> }));
vi.mock("@/components/channel-create-dialog", () => ({
  default: ({ open, blocking }: { open: boolean; blocking?: boolean }) =>
    open ? <div data-testid="channel-create-dialog" data-blocking={String(blocking)} /> : null,
}));

const channel: StudioChannel = {
  id: 1,
  name: "Channel",
  handle: "channel",
  self_introduction: "",
  icon_url: null,
  banner_url: null,
  gifts_enabled: false,
  public_url: "https://live.example.test/channel",
  created_at: "2026-08-10T10:00:00+09:00",
  updated_at: "2026-08-10T10:00:00+09:00",
};

describe("Studio shell channel navigation", () => {
  beforeEach(() => {
    vi.stubGlobal("PointerEvent", MouseEvent);
    Object.defineProperty(HTMLElement.prototype, "hasPointerCapture", {
      configurable: true,
      value: vi.fn(() => false),
    });
    Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
      configurable: true,
      value: vi.fn(),
    });
  });

  afterEach(cleanup);

  it("links from the channel switcher to the complete channel list", async () => {
    render(
      <StudioShell
        channels={[channel]}
        channel={channel}
        token="token"
        defaultIconUrl="https://example.test/user.jpg"
      >
        <div>Dashboard</div>
      </StudioShell>
    );

    fireEvent.pointerDown(
      screen.getByRole("button", { name: "チャンネルとアカウントを切り替える" }),
      { button: 0, ctrlKey: false }
    );

    expect(
      await screen.findByRole("menuitem", { name: "すべてのチャンネルを表示" })
    ).toHaveAttribute("href", "/studio/channels");
  });

  it("opens a blocking creation dialog when no channel is owned", () => {
    render(
      <StudioShell
        channels={[]}
        channel={null}
        token="token"
        defaultIconUrl="https://example.test/user.jpg"
      >
        {null}
      </StudioShell>
    );

    expect(screen.getByTestId("channel-create-dialog")).toHaveAttribute("data-blocking", "true");
    expect(
      screen.queryByRole("button", { name: "チャンネルとアカウントを切り替える" })
    ).not.toBeInTheDocument();
  });
});
