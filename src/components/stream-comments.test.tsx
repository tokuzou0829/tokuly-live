import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { StreamComments } from "./stream-comments";
import {
  createStreamComment,
  deleteStreamComment,
  getStreamComments,
  updateStreamComment,
} from "@/requests/comments";

vi.mock("next-auth/react", () => ({ signIn: vi.fn() }));
vi.mock("@/requests/comments", () => ({
  CommentApiError: class CommentApiError extends Error {
    status = 500;
    fields = {};
  },
  createStreamComment: vi.fn(),
  deleteStreamComment: vi.fn(),
  getStreamComments: vi.fn(),
  updateStreamComment: vi.fn(),
}));

const ownComment = {
  id: 10,
  content: "最初のコメント",
  author: { id: 1, name: "投稿者", profile_photo_url: "https://example.test/avatar.png" },
  created_at: "2026-07-30T10:00:00+09:00",
  updated_at: "2026-07-30T10:00:00+09:00",
  edited_at: null,
};

const session = {
  user: { id: "1", name: "投稿者", access_token: "token" },
  expires: "2099-01-01",
} as Session;

describe("StreamComments", () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getStreamComments).mockResolvedValue({
      data: [ownComment],
      next_before_id: null,
      has_more: false,
    });
  });

  it("loads comments publicly and asks guests to log in", async () => {
    render(<StreamComments streamId={3} session={null} />);

    expect(await screen.findByText("最初のコメント")).toBeInTheDocument();
    expect(getStreamComments).toHaveBeenCalledWith(3);
    expect(screen.getByRole("button", { name: "ログイン" })).toBeInTheDocument();
  });

  it("prepends older comments without duplicating existing comments", async () => {
    vi.mocked(getStreamComments)
      .mockResolvedValueOnce({ data: [ownComment], next_before_id: 10, has_more: true })
      .mockResolvedValueOnce({
        data: [{ ...ownComment, id: 9, content: "過去のコメント" }, ownComment],
        next_before_id: null,
        has_more: false,
      });
    render(<StreamComments streamId={3} session={null} />);

    fireEvent.click(await screen.findByRole("button", { name: "過去のコメントを表示" }));
    expect(await screen.findByText("過去のコメント")).toBeInTheDocument();
    expect(screen.getAllByText("最初のコメント")).toHaveLength(1);
    expect(getStreamComments).toHaveBeenLastCalledWith(3, 10);
  });

  it("posts a trimmed comment and appends the response", async () => {
    vi.mocked(createStreamComment).mockResolvedValue({
      ...ownComment,
      id: 11,
      content: "新しいコメント",
    });
    render(<StreamComments streamId={3} session={session} />);

    fireEvent.change(screen.getByRole("textbox", { name: "コメント" }), {
      target: { value: "  新しいコメント  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "コメント" }));

    expect(await screen.findByText("新しいコメント")).toBeInTheDocument();
    expect(createStreamComment).toHaveBeenCalledWith(3, "新しいコメント", "token", undefined);
  });

  it("posts with the selected channel identity", async () => {
    vi.mocked(createStreamComment).mockResolvedValue({ ...ownComment, id: 11 });
    const channelSession = {
      ...session,
      activePostingIdentity: {
        type: "channel",
        accountId: "1",
        channelId: 7,
        name: "Channel",
        handle: "channel",
        profilePhotoUrl: "https://example.test/channel.jpg",
      },
    } as Session;
    const { container } = render(<StreamComments streamId={3} session={channelSession} />);

    fireEvent.change(screen.getByRole("textbox", { name: "コメント" }), {
      target: { value: "チャンネル投稿" },
    });
    fireEvent.click(screen.getByRole("button", { name: "コメント" }));

    await waitFor(() =>
      expect(createStreamComment).toHaveBeenCalledWith(3, "チャンネル投稿", "token", 7)
    );
    expect(container.querySelector("form img")).toHaveAttribute(
      "src",
      "https://example.test/channel.jpg"
    );
  });

  it("allows the author to edit and delete their comment", async () => {
    vi.mocked(updateStreamComment).mockResolvedValue({
      ...ownComment,
      content: "編集後",
      edited_at: "2026-07-30T11:00:00+09:00",
    });
    vi.mocked(deleteStreamComment).mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<StreamComments streamId={3} session={session} />);

    fireEvent.click(await screen.findByRole("button", { name: "編集" }));
    fireEvent.change(screen.getByRole("textbox", { name: "コメントを編集" }), {
      target: { value: "編集後" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() =>
      expect(screen.queryByRole("textbox", { name: "コメントを編集" })).not.toBeInTheDocument()
    );
    expect(screen.getByText("編集後")).toBeInTheDocument();
    expect(updateStreamComment).toHaveBeenCalledWith(3, 10, "編集後", "token");

    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    await waitFor(() => expect(screen.queryByText("編集後")).not.toBeInTheDocument());
    expect(deleteStreamComment).toHaveBeenCalledWith(3, 10, "token");
  });

  it("does not enable whitespace-only submissions", async () => {
    render(<StreamComments streamId={3} session={session} />);
    await screen.findByText("最初のコメント");
    fireEvent.change(screen.getByRole("textbox", { name: "コメント" }), {
      target: { value: "   " },
    });
    expect(screen.getByRole("button", { name: "コメント" })).toBeDisabled();
  });
});
