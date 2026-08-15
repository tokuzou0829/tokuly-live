import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StudioComment, StudioCommentPage } from "@/types/studio";
import StudioLatestCommentsCard from "./studio-latest-comments-card";

const mocks = vi.hoisted(() => ({ react: vi.fn(), unreact: vi.fn() }));

vi.mock("@/requests/studio", () => ({
  addStudioCommentReaction: mocks.react,
  removeStudioCommentReaction: mocks.unreact,
}));

const comment = (overrides: Partial<StudioComment> = {}): StudioComment => ({
  id: 100,
  parent_comment_id: null,
  content: "最新コメント",
  author: {
    id: 1,
    type: "user",
    channel_id: null,
    name: "Viewer",
    handle: "viewer",
    profile_photo_url: null,
  },
  reply_count: 0,
  creator_reacted_at: null,
  created_at: "2026-08-15T10:00:00+09:00",
  updated_at: "2026-08-15T10:00:00+09:00",
  edited_at: null,
  ...overrides,
});

const page = (data: StudioComment[]): StudioCommentPage => ({
  data,
  links: {},
  meta: {
    current_page: 1,
    from: data.length ? 1 : null,
    last_page: 1,
    path: "https://api.example.test/comments",
    per_page: 5,
    to: data.length || null,
    total: data.length,
  },
});

describe("StudioLatestCommentsCard", () => {
  afterEach(cleanup);

  beforeEach(() => {
    mocks.react.mockReset();
    mocks.unreact.mockReset();
  });

  it("shows latest comments, reply context, and the complete management link", () => {
    render(
      <StudioLatestCommentsCard
        streamId={417}
        token="token"
        initial={page([
          comment(),
          comment({ id: 101, parent_comment_id: 100, content: "最新の返信" }),
        ])}
      />
    );

    expect(screen.getByText("最新コメント")).toBeInTheDocument();
    expect(screen.getByText("最新の返信")).toBeInTheDocument();
    expect(screen.getByText("返信")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "コメントを管理" })).toHaveAttribute(
      "href",
      "/studio/comments?view=flat&stream_id=417"
    );
    expect(screen.queryByRole("button", { name: "更新" })).not.toBeInTheDocument();
  });

  it("keeps an initial loading failure inside the card", () => {
    render(<StudioLatestCommentsCard streamId={417} token="token" initial={null} />);
    expect(screen.getByRole("alert")).toHaveTextContent("最新コメントを読み込めませんでした");
  });

  it("toggles a reaction directly from the latest comments card", async () => {
    mocks.react.mockResolvedValue("2026-08-15T12:00:00+09:00");
    mocks.unreact.mockResolvedValue(null);
    render(<StudioLatestCommentsCard streamId={417} token="token" initial={page([comment()])} />);

    const reactionButton = screen.getByRole("button", { name: "リアクションする" });
    expect(reactionButton.textContent).toBe("");
    fireEvent.click(reactionButton);
    await waitFor(() => expect(mocks.react).toHaveBeenCalledWith(417, 100, "token"));
    fireEvent.click(screen.getByRole("button", { name: "リアクションを解除" }));
    await waitFor(() => expect(mocks.unreact).toHaveBeenCalledWith(417, 100, "token"));
  });
});
