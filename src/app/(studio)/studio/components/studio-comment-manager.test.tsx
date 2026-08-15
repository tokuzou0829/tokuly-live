import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StudioComment, StudioCommentPage } from "@/types/studio";
import StudioCommentManager from "./studio-comment-manager";

const mocks = vi.hoisted(() => ({
  replies: vi.fn(),
  remove: vi.fn(),
  react: vi.fn(),
  unreact: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
}));

vi.mock("@/requests/studio", () => ({
  getStudioCommentReplies: mocks.replies,
  deleteStudioComment: mocks.remove,
  addStudioCommentReaction: mocks.react,
  removeStudioCommentReaction: mocks.unreact,
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
  useSearchParams: () => new URLSearchParams(),
}));

const comment = (overrides: Partial<StudioComment> = {}): StudioComment => ({
  id: 100,
  parent_comment_id: null,
  content: "管理対象コメント",
  author: {
    id: 5,
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
  stream: {
    id: 34,
    title: "テスト配信",
    type: "live",
    status: "end",
    stream_key: "stream-key",
    thumbnail_url: null,
  },
  ...overrides,
});

const result = (data: StudioComment[]): StudioCommentPage => ({
  data,
  links: {},
  meta: {
    current_page: 1,
    from: data.length ? 1 : null,
    last_page: 1,
    path: "https://api.example.test/comments",
    per_page: 20,
    to: data.length,
    total: data.length,
  },
});

const filters = { query: "", author: "", authorType: "" as const, from: "", to: "" };

describe("StudioCommentManager", () => {
  afterEach(cleanup);

  beforeEach(() => {
    mocks.replies.mockReset();
    mocks.remove.mockReset();
    mocks.react.mockReset();
    mocks.unreact.mockReset();
    mocks.push.mockReset();
    mocks.refresh.mockReset();
  });

  it("shows stream context and loads replies recursively", async () => {
    const root = comment({ reply_count: 1, has_more_replies: true });
    const child = comment({
      id: 101,
      parent_comment_id: 100,
      content: "直接返信",
      reply_count: 1,
      has_more_replies: true,
      stream: undefined,
    });
    const grandchild = comment({
      id: 102,
      parent_comment_id: 101,
      content: "返信への返信",
      stream: undefined,
    });
    mocks.replies
      .mockResolvedValueOnce({ data: [child], next_after_id: null, has_more: false })
      .mockResolvedValueOnce({ data: [grandchild], next_after_id: null, has_more: false });

    render(
      <StudioCommentManager
        result={result([root])}
        token="token"
        view="threaded"
        stream={null}
        filters={filters}
      />
    );
    expect(screen.getByRole("link", { name: /テスト配信/ })).toHaveAttribute(
      "href",
      "/studio/comments?stream_id=34"
    );
    fireEvent.click(screen.getByRole("button", { name: "返信をさらに表示" }));
    expect(await screen.findByText("直接返信")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "返信をさらに表示" }));
    expect(await screen.findByText("返信への返信")).toBeInTheDocument();
    expect(mocks.replies).toHaveBeenNthCalledWith(1, 34, 100, "token", undefined);
    expect(mocks.replies).toHaveBeenNthCalledWith(2, 34, 101, "token", undefined);
  });

  it("requires confirmation and refreshes after deletion", async () => {
    mocks.remove.mockResolvedValue(null);
    render(
      <StudioCommentManager
        result={result([comment()])}
        token="token"
        view="flat"
        stream={null}
        filters={filters}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    expect(screen.getByText(/すべての返信も削除/)).toBeInTheDocument();
    expect(mocks.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith(34, 100, "token"));
    expect(mocks.refresh).toHaveBeenCalled();
  });

  it("rejects an end time earlier than the start time", () => {
    const { container } = render(
      <StudioCommentManager
        result={result([])}
        token="token"
        view="threaded"
        stream={null}
        filters={filters}
      />
    );
    fireEvent.change(container.querySelector('input[name="from"]')!, {
      target: { value: "2026-08-15T12:00" },
    });
    fireEvent.change(container.querySelector('input[name="to"]')!, {
      target: { value: "2026-08-15T11:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "絞り込む" }));
    expect(screen.getByRole("alert")).toHaveTextContent("終了日時は開始日時以降");
    expect(mocks.push).not.toHaveBeenCalled();
  });

  it("adds and removes reactions on root comments and nested replies", async () => {
    mocks.react.mockResolvedValue("2026-08-15T12:00:00+09:00");
    mocks.unreact.mockResolvedValue(null);
    const child = comment({
      id: 101,
      parent_comment_id: 100,
      content: "リアクション対象の返信",
      creator_reacted_at: "2026-08-15T11:00:00+09:00",
      stream: undefined,
    });
    render(
      <StudioCommentManager
        result={result([comment({ reply_count: 1, replies: [child] })])}
        token="token"
        view="threaded"
        stream={null}
        filters={filters}
      />
    );

    const rootRow = screen.getByText("管理対象コメント").closest("li");
    const rootReactionButton = within(rootRow!).getByRole("button", {
      name: "リアクションする",
    });
    expect(rootReactionButton.textContent).toBe("");
    fireEvent.click(rootReactionButton);
    await waitFor(() => expect(mocks.react).toHaveBeenCalledWith(34, 100, "token"));
    expect(screen.getAllByRole("button", { name: "リアクションを解除" })).toHaveLength(2);

    const replyRow = screen.getByText("リアクション対象の返信").closest("li");
    fireEvent.click(within(replyRow!).getByRole("button", { name: "リアクションを解除" }));
    await waitFor(() => expect(mocks.unreact).toHaveBeenCalledWith(34, 101, "token"));
    expect(within(replyRow!).getByRole("button", { name: "リアクションする" })).toBeInTheDocument();
  });

  it("keeps the reaction state and shows an error when the API fails", async () => {
    mocks.react.mockRejectedValue(new Error("対象が見つかりません。"));
    render(
      <StudioCommentManager
        result={result([comment()])}
        token="token"
        view="flat"
        stream={null}
        filters={filters}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "リアクションする" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("対象が見つかりません");
    expect(screen.getByRole("button", { name: "リアクションする" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("prevents duplicate reaction requests while an update is pending", async () => {
    let resolveReaction!: (value: string) => void;
    mocks.react.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveReaction = resolve;
      })
    );
    render(
      <StudioCommentManager
        result={result([comment()])}
        token="token"
        view="flat"
        stream={null}
        filters={filters}
      />
    );

    const button = screen.getByRole("button", { name: "リアクションする" });
    fireEvent.click(button);
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(mocks.react).toHaveBeenCalledTimes(1);
    resolveReaction("2026-08-15T12:00:00+09:00");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "リアクションを解除" })).toBeEnabled()
    );
  });
});
