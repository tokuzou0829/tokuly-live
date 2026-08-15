import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signIn, useSession } from "next-auth/react";
import { getStreamReaction, removeStreamReaction, setStreamReaction } from "@/requests/reactions";
import StreamReactionButtons from "./stream-reaction-buttons";

vi.mock("next-auth/react", () => ({ signIn: vi.fn(), useSession: vi.fn() }));
vi.mock("@/requests/reactions", () => ({
  getStreamReaction: vi.fn(),
  removeStreamReaction: vi.fn(),
  setStreamReaction: vi.fn(),
}));

describe("StreamReactionButtons", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/video/video-key?room_id=room");
  });
  afterEach(cleanup);

  it("shows public counts and opens login guidance for a guest", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });
    render(<StreamReactionButtons streamId={34} initialLikeCount={12} initialDislikeCount={2} />);

    fireEvent.click(screen.getByRole("button", { name: "いいね 12件" }));
    expect(screen.getByRole("heading", { name: "ログインが必要です" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "ログイン" }));
    expect(signIn).toHaveBeenCalledWith("tokuly", {
      callbackUrl: "/video/video-key?room_id=room",
    });
  });

  it("shows rating labels instead of zero counts", () => {
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: vi.fn(),
    });
    render(<StreamReactionButtons streamId={34} />);

    expect(screen.getByText("高評価")).toBeInTheDocument();
    expect(screen.getByText("低評価")).toBeInTheDocument();
  });

  it("loads, switches, and removes the authenticated viewer reaction", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        expires: "2099-01-01",
        user: { id: "1", name: "User", access_token: "token" },
        activePostingIdentity: {
          type: "user",
          accountId: "1",
          name: "User",
          handle: "user",
          profilePhotoUrl: "",
        },
      },
      status: "authenticated",
      update: vi.fn(),
    });
    vi.mocked(getStreamReaction).mockResolvedValue({
      reaction: "like",
      like_count: 12,
      dislike_count: 2,
    });
    vi.mocked(setStreamReaction).mockResolvedValue({
      reaction: "dislike",
      like_count: 11,
      dislike_count: 3,
    });
    vi.mocked(removeStreamReaction).mockResolvedValue({
      reaction: null,
      like_count: 11,
      dislike_count: 2,
    });

    render(<StreamReactionButtons streamId={34} initialLikeCount={10} initialDislikeCount={1} />);
    const like = await screen.findByRole("button", { name: "いいね 12件" });
    expect(like).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "よくないね 2件" }));
    await waitFor(() => expect(setStreamReaction).toHaveBeenCalledWith(34, "dislike", "token"));
    expect(await screen.findByRole("button", { name: "よくないね 3件" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );

    fireEvent.click(screen.getByRole("button", { name: "よくないね 3件" }));
    await waitFor(() => expect(removeStreamReaction).toHaveBeenCalledWith(34, "token"));
    expect(await screen.findByRole("button", { name: "よくないね 2件" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("keeps the current state and displays an API error", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        expires: "2099-01-01",
        user: { id: "1", name: "User", access_token: "token" },
        activePostingIdentity: {
          type: "user",
          accountId: "1",
          name: "User",
          handle: "user",
          profilePhotoUrl: "",
        },
      },
      status: "authenticated",
      update: vi.fn(),
    });
    vi.mocked(getStreamReaction).mockResolvedValue({
      reaction: null,
      like_count: 4,
      dislike_count: 1,
    });
    vi.mocked(setStreamReaction).mockRejectedValue(new Error("現在の配信状態では評価できません。"));

    render(<StreamReactionButtons streamId={34} initialLikeCount={4} initialDislikeCount={1} />);
    fireEvent.click(await screen.findByRole("button", { name: "いいね 4件" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "現在の配信状態では評価できません。"
    );
    expect(screen.getByRole("button", { name: "いいね 4件" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("prevents duplicate requests while an update is pending", async () => {
    vi.mocked(useSession).mockReturnValue({
      data: {
        expires: "2099-01-01",
        user: { id: "1", name: "User", access_token: "token" },
        activePostingIdentity: {
          type: "user",
          accountId: "1",
          name: "User",
          handle: "user",
          profilePhotoUrl: "",
        },
      },
      status: "authenticated",
      update: vi.fn(),
    });
    vi.mocked(getStreamReaction).mockResolvedValue({
      reaction: null,
      like_count: 4,
      dislike_count: 1,
    });
    let resolveUpdate!: (value: {
      reaction: "like";
      like_count: number;
      dislike_count: number;
    }) => void;
    vi.mocked(setStreamReaction).mockReturnValue(
      new Promise((resolve) => {
        resolveUpdate = resolve;
      })
    );

    render(<StreamReactionButtons streamId={34} initialLikeCount={4} initialDislikeCount={1} />);
    const like = await screen.findByRole("button", { name: "いいね 4件" });
    fireEvent.click(like);
    fireEvent.click(like);
    expect(setStreamReaction).toHaveBeenCalledTimes(1);

    resolveUpdate({ reaction: "like", like_count: 5, dislike_count: 1 });
    expect(await screen.findByRole("button", { name: "いいね 5件" })).toBeEnabled();
  });
});
