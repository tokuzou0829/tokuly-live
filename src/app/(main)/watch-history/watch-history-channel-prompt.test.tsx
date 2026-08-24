import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import WatchHistoryChannelPrompt from "./watch-history-channel-prompt";

const update = vi.fn();
const refresh = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: () => ({ update }),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

describe("WatchHistoryChannelPrompt", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("PointerEvent", MouseEvent);
  });

  afterEach(cleanup);

  it("shows a channel creation button when the user owns no channels", () => {
    render(<WatchHistoryChannelPrompt channels={[]} />);

    expect(screen.getByRole("link", { name: "チャンネルを作成" })).toHaveAttribute(
      "href",
      "/studio"
    );
    expect(screen.queryByRole("button", { name: "チャンネルを選択" })).not.toBeInTheDocument();
  });

  it("lets the user select an owned channel and refreshes the history page", async () => {
    update.mockResolvedValue({
      activePostingIdentity: { type: "channel", channelId: 7 },
    });
    render(
      <WatchHistoryChannelPrompt
        channels={[
          {
            id: 7,
            name: "テストチャンネル",
            handle: "test-channel",
            profile_photo_url: "https://example.test/channel.jpg",
          },
        ]}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "チャンネルを選択" }));
    fireEvent.click(await screen.findByRole("button", { name: /テストチャンネル/ }));

    await waitFor(() => expect(update).toHaveBeenCalledWith({ activeChannelId: 7 }));
    expect(refresh).toHaveBeenCalledOnce();
  });
});
