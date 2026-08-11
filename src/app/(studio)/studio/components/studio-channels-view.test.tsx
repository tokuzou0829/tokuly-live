import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StudioChannel } from "@/types/studio";
import StudioChannelsView from "./studio-channels-view";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("../actions", () => ({
  selectStudioChannel: "/studio",
  activateStudioChannel: vi.fn(),
}));
vi.mock("@/components/channel-create-dialog", () => ({
  default: ({ open }: { open: boolean }) => (open ? <div>作成ダイアログ</div> : null),
}));

const channel = (id: number): StudioChannel => ({
  id,
  name: `Channel ${id}`,
  handle: `channel-${id}`,
  self_introduction: "",
  icon_url: null,
  banner_url: null,
  gifts_enabled: false,
  public_url: `https://live.example.test/channel-${id}`,
  created_at: "2026-08-10T10:00:00+09:00",
  updated_at: "2026-08-10T10:00:00+09:00",
});

describe("Studio channels view", () => {
  afterEach(cleanup);

  it("shows every channel, the active channel, and opens channel creation", () => {
    const channels = [channel(1), channel(2)];
    render(
      <StudioChannelsView
        token="token"
        channels={channels}
        channel={channels[0]}
        defaultIconUrl="https://example.test/user.jpg"
      />
    );

    expect(screen.getByText("2 / 5")).toBeInTheDocument();
    expect(screen.getByText("Channel 1")).toBeInTheDocument();
    expect(screen.getByText("Channel 2")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Channel 1（選択中）" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Channel 2を選択" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "新しいチャンネルを作成" }));
    expect(screen.getByText("作成ダイアログ")).toBeInTheDocument();
  });

  it("disables creation when five channels are owned", () => {
    const channels = [1, 2, 3, 4, 5].map(channel);
    render(
      <StudioChannelsView
        token="token"
        channels={channels}
        channel={channels[0]}
        defaultIconUrl="https://example.test/user.jpg"
      />
    );

    expect(screen.getByText("5 / 5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新しいチャンネルを作成" })).toBeDisabled();
    expect(
      screen.getByText("作成できるチャンネル数の上限（5件）に達しています。")
    ).toBeInTheDocument();
  });
});
