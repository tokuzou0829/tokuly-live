import React from "react";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "next-auth";
import { StreamComments as StreamCommentsComponent } from "./stream-comments";
import {
  createStreamComment,
  deleteStreamComment,
  getStreamCommentReplies,
  getStreamComments,
  updateStreamComment,
} from "@/requests/comments";
import type { StreamComment } from "@/types/comment";
import { TooltipProvider } from "@/components/ui/tooltip";

type StreamCommentsProps = React.ComponentProps<typeof StreamCommentsComponent>;

function StreamComments({
  creatorName = "配信者",
  creatorIconUrl = "https://example.test/creator.png",
  ...props
}: Omit<StreamCommentsProps, "creatorName" | "creatorIconUrl"> &
  Partial<Pick<StreamCommentsProps, "creatorName" | "creatorIconUrl">>) {
  return (
    <TooltipProvider delayDuration={0}>
      <StreamCommentsComponent
        {...props}
        creatorName={creatorName}
        creatorIconUrl={creatorIconUrl}
      />
    </TooltipProvider>
  );
}

vi.mock("next-auth/react", () => ({ signIn: vi.fn() }));
vi.mock("@/requests/comments", () => ({
  CommentApiError: class CommentApiError extends Error {
    status = 500;
    fields = {};
  },
  createStreamComment: vi.fn(),
  deleteStreamComment: vi.fn(),
  getStreamCommentReplies: vi.fn(),
  getStreamComments: vi.fn(),
  updateStreamComment: vi.fn(),
}));

function makeComment(overrides: Partial<StreamComment> = {}): StreamComment {
  return {
    id: 10,
    parent_comment_id: null,
    content: "最初のコメント",
    author: {
      id: 1,
      type: "user",
      channel_id: null,
      name: "投稿者",
      handle: "author",
      profile_photo_url: "https://example.test/avatar.png",
    },
    reply_count: 0,
    creator_reacted_at: null,
    created_at: "2026-07-30T10:00:00+09:00",
    updated_at: "2026-07-30T10:00:00+09:00",
    edited_at: null,
    ...overrides,
  };
}

const ownComment = makeComment();

const session = {
  user: { id: "1", name: "投稿者", access_token: "token" },
  activePostingIdentity: {
    type: "user",
    accountId: "1",
    name: "投稿者",
    handle: "author",
    profilePhotoUrl: "https://example.test/avatar.png",
  },
  expires: "2099-01-01",
} as Session;

function channelSession(channelId: number): Session {
  return {
    ...session,
    activePostingIdentity: {
      type: "channel",
      accountId: "1",
      channelId,
      name: `Channel ${channelId}`,
      handle: `channel-${channelId}`,
      profilePhotoUrl: `https://example.test/channel-${channelId}.jpg`,
    },
  } as Session;
}

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
    render(<StreamComments streamId={3} streamChannelId={7} session={null} />);

    expect(await screen.findByText("最初のコメント")).toBeInTheDocument();
    expect(getStreamComments).toHaveBeenCalledWith(3);
    expect(screen.getByRole("button", { name: "ログイン" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "返信" })).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("button", { name: "コメントメニュー" }), {
      key: "Enter",
      code: "Enter",
    });
    expect(await screen.findByRole("menuitem", { name: "報告" })).toHaveAttribute(
      "href",
      "https://tokuly.com/support/report"
    );
  });

  it("prepends older comments without duplicating existing comments", async () => {
    vi.mocked(getStreamComments)
      .mockResolvedValueOnce({ data: [ownComment], next_before_id: 10, has_more: true })
      .mockResolvedValueOnce({
        data: [makeComment({ id: 9, content: "過去のコメント" }), ownComment],
        next_before_id: null,
        has_more: false,
      });
    render(<StreamComments streamId={3} streamChannelId={7} session={null} />);

    fireEvent.click(await screen.findByRole("button", { name: "過去のコメントを表示" }));
    expect(await screen.findByText("過去のコメント")).toBeInTheDocument();
    expect(screen.getAllByText("最初のコメント")).toHaveLength(1);
    expect(getStreamComments).toHaveBeenLastCalledWith(3, 10);
  });

  it("posts a trimmed root comment", async () => {
    vi.mocked(createStreamComment).mockResolvedValue(
      makeComment({ id: 11, content: "新しいコメント" })
    );
    render(<StreamComments streamId={3} streamChannelId={7} session={session} />);

    fireEvent.change(screen.getByRole("textbox", { name: "コメント" }), {
      target: { value: "  新しいコメント  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "コメント" }));

    expect(await screen.findByText("新しいコメント")).toBeInTheDocument();
    expect(createStreamComment).toHaveBeenCalledWith(
      3,
      { content: "新しいコメント", channelId: undefined },
      "token"
    );
  });

  it("posts a reply with the selected channel identity", async () => {
    const createdReply = makeComment({
      id: 11,
      parent_comment_id: 10,
      content: "チャンネル返信",
      author: {
        id: 1,
        type: "channel",
        channel_id: 7,
        name: "Channel 7",
        handle: "channel-7",
        profile_photo_url: "https://example.test/channel-7.jpg",
      },
    });
    vi.mocked(createStreamComment).mockResolvedValue(createdReply);
    render(<StreamComments streamId={3} streamChannelId={99} session={channelSession(7)} />);

    fireEvent.click(await screen.findByRole("button", { name: "返信" }));
    fireEvent.change(screen.getByRole("textbox", { name: "返信を入力" }), {
      target: { value: "  チャンネル返信  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "返信する" }));

    await waitFor(() => expect(createStreamComment).toHaveBeenCalled());
    expect(await screen.findByText("チャンネル返信")).toBeInTheDocument();
    expect(createStreamComment).toHaveBeenCalledWith(
      3,
      { content: "チャンネル返信", parentCommentId: 10, channelId: 7 },
      "token"
    );
  });

  it("renders preview replies and loads the remaining direct replies without duplicates", async () => {
    const preview = makeComment({
      id: 11,
      parent_comment_id: 10,
      content: "プレビュー返信",
    });
    vi.mocked(getStreamComments).mockResolvedValue({
      data: [
        makeComment({
          reply_count: 2,
          replies: [preview],
          has_more_replies: true,
          next_reply_after_id: 11,
        }),
      ],
      next_before_id: null,
      has_more: false,
    });
    vi.mocked(getStreamCommentReplies).mockResolvedValue({
      data: [preview, makeComment({ id: 12, parent_comment_id: 10, content: "追加返信" })],
      next_after_id: null,
      has_more: false,
    });
    const { container } = render(
      <StreamComments streamId={3} streamChannelId={7} session={null} />
    );

    await screen.findByText("最初のコメント");
    expect(screen.queryByText("プレビュー返信")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "返信2件を表示" }));

    const previewText = screen.getByText("プレビュー返信");
    const previewItem = previewText.closest("li");
    expect(previewItem?.parentElement?.closest("li")).toContainElement(
      screen.getByText("最初のコメント")
    );
    expect(container.querySelector(".border-t")).not.toBeInTheDocument();
    expect(getStreamCommentReplies).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "返信をさらに表示" }));

    expect(await screen.findByText("追加返信")).toBeInTheDocument();
    expect(screen.getAllByText("プレビュー返信")).toHaveLength(1);
    expect(getStreamCommentReplies).toHaveBeenCalledWith(3, 10, 11);

    fireEvent.click(screen.getByRole("button", { name: "返信を非表示" }));
    expect(screen.queryByText("プレビュー返信")).not.toBeInTheDocument();
    expect(screen.queryByText("追加返信")).not.toBeInTheDocument();
  });

  it("loads replies to an already loaded reply", async () => {
    const reply = makeComment({
      id: 11,
      parent_comment_id: 10,
      content: "親になる返信",
      reply_count: 1,
    });
    vi.mocked(getStreamComments).mockResolvedValue({
      data: [makeComment({ reply_count: 1, replies: [reply], has_more_replies: false })],
      next_before_id: null,
      has_more: false,
    });
    vi.mocked(getStreamCommentReplies).mockResolvedValue({
      data: [makeComment({ id: 12, parent_comment_id: 11, content: "孫返信" })],
      next_after_id: null,
      has_more: false,
    });
    render(<StreamComments streamId={3} streamChannelId={7} session={null} />);

    fireEvent.click(await screen.findByRole("button", { name: "返信1件を表示" }));
    expect(screen.getByText("親になる返信")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "返信1件を表示" }));
    expect(await screen.findByText("孫返信")).toBeInTheDocument();
    expect(getStreamCommentReplies).toHaveBeenCalledWith(3, 11, undefined);
  });

  it("shows the creator icon and heart on reacted root comments and nested replies", async () => {
    const reactedAt = "2026-08-15T12:00:00+09:00";
    const reply = makeComment({
      id: 11,
      parent_comment_id: 10,
      content: "反応済みの返信",
      creator_reacted_at: reactedAt,
    });
    vi.mocked(getStreamComments).mockResolvedValue({
      data: [
        makeComment({
          creator_reacted_at: reactedAt,
          reply_count: 1,
          replies: [reply],
          has_more_replies: false,
        }),
      ],
      next_before_id: null,
      has_more: false,
    });
    render(
      <StreamComments
        streamId={3}
        streamChannelId={7}
        session={session}
        creatorName="配信チャンネル"
        creatorIconUrl="https://example.test/stream-creator.png"
      />
    );

    const rootReaction = await screen.findByRole("img", {
      name: "配信チャンネルさんが反応",
    });
    expect(rootReaction.parentElement).toContainElement(
      screen.getByRole("button", { name: "返信" })
    );
    expect(rootReaction.querySelector("svg")?.parentElement).toBe(rootReaction);
    fireEvent.focus(rootReaction);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("配信チャンネルさんが反応");
    fireEvent.click(screen.getByRole("button", { name: "返信1件を表示" }));
    expect(screen.getAllByRole("img", { name: "配信チャンネルさんが反応" })).toHaveLength(2);
    expect(
      document.querySelectorAll('img[src="https://example.test/stream-creator.png"]')
    ).toHaveLength(2);
  });

  it("uses the creator name fallback and hides the badge on unreacted comments", async () => {
    vi.mocked(getStreamComments).mockResolvedValue({
      data: [
        makeComment({ id: 10, content: "未反応" }),
        makeComment({
          id: 11,
          content: "反応済み",
          creator_reacted_at: "2026-08-15T12:00:00+09:00",
        }),
      ],
      next_before_id: null,
      has_more: false,
    });
    render(
      <StreamComments
        streamId={3}
        streamChannelId={7}
        session={null}
        creatorName="配信チャンネル"
        creatorIconUrl={null}
      />
    );

    await screen.findByText("反応済み");
    expect(screen.getAllByRole("img", { name: "配信チャンネルさんが反応" })).toHaveLength(1);
    expect(screen.getByText("配", { selector: "span" })).toBeInTheDocument();
  });

  it("edits and deletes a nested reply", async () => {
    const reply = makeComment({ id: 11, parent_comment_id: 10, content: "返信本文" });
    vi.mocked(getStreamComments).mockResolvedValue({
      data: [makeComment({ reply_count: 1, replies: [reply], has_more_replies: false })],
      next_before_id: null,
      has_more: false,
    });
    vi.mocked(updateStreamComment).mockResolvedValue(
      makeComment({
        id: 11,
        parent_comment_id: 10,
        content: "編集した返信",
        edited_at: "2026-07-30T11:00:00+09:00",
      })
    );
    vi.mocked(deleteStreamComment).mockResolvedValue(undefined);
    render(<StreamComments streamId={3} streamChannelId={99} session={session} />);

    fireEvent.click(await screen.findByRole("button", { name: "返信1件を表示" }));
    const replyRow = (await screen.findByText("返信本文")).closest("li");
    expect(replyRow).not.toBeNull();
    fireEvent.click(within(replyRow!).getByRole("button", { name: "編集" }));
    fireEvent.change(screen.getByRole("textbox", { name: "コメントを編集" }), {
      target: { value: "編集した返信" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(updateStreamComment).toHaveBeenCalled());
    expect(await screen.findByText("編集した返信")).toBeInTheDocument();

    const editedRow = screen.getByText("編集した返信").closest("li");
    fireEvent.keyDown(within(editedRow!).getByRole("button", { name: "コメントメニュー" }), {
      key: "Enter",
      code: "Enter",
    });
    fireEvent.click(await screen.findByRole("menuitem", { name: "削除" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("このコメントを削除しますか？")).toBeInTheDocument();
    expect(deleteStreamComment).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "削除する" }));
    await waitFor(() => expect(screen.queryByText("編集した返信")).not.toBeInTheDocument());
    expect(screen.getByText("最初のコメント")).toBeInTheDocument();
    expect(updateStreamComment).toHaveBeenCalledWith(3, 11, "編集した返信", "token");
    expect(deleteStreamComment).toHaveBeenCalledWith(3, 11, "token");
  });

  it("cancels comment deletion from the confirmation modal", async () => {
    render(<StreamComments streamId={3} streamChannelId={99} session={session} />);

    fireEvent.keyDown(await screen.findByRole("button", { name: "コメントメニュー" }), {
      key: "Enter",
      code: "Enter",
    });
    fireEvent.click(await screen.findByRole("menuitem", { name: "削除" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "キャンセル" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(deleteStreamComment).not.toHaveBeenCalled();
    expect(screen.getByText("最初のコメント")).toBeInTheDocument();
  });

  it("shows edit and delete only for the active posting identity", async () => {
    const channelComment = makeComment({
      author: {
        id: 1,
        type: "channel",
        channel_id: 7,
        name: "Channel 7",
        handle: "channel-7",
        profile_photo_url: "https://example.test/channel-7.jpg",
      },
    });
    vi.mocked(getStreamComments).mockResolvedValue({
      data: [channelComment],
      next_before_id: null,
      has_more: false,
    });
    const { rerender } = render(
      <StreamComments streamId={3} streamChannelId={99} session={channelSession(7)} />
    );

    expect(await screen.findByRole("button", { name: "編集" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "編集" }));
    expect(screen.getByRole("textbox", { name: "コメントを編集" })).toBeInTheDocument();

    rerender(<StreamComments streamId={3} streamChannelId={99} session={channelSession(8)} />);
    await waitFor(() =>
      expect(screen.queryByRole("textbox", { name: "コメントを編集" })).not.toBeInTheDocument()
    );
    expect(screen.queryByRole("button", { name: "編集" })).not.toBeInTheDocument();
    fireEvent.keyDown(screen.getByRole("button", { name: "コメントメニュー" }), {
      key: "Enter",
      code: "Enter",
    });
    expect(screen.queryByRole("menuitem", { name: "削除" })).not.toBeInTheDocument();
  });

  it("allows moderation deletion only while the stream channel identity is active", async () => {
    const otherComment = makeComment({
      author: {
        id: 2,
        type: "user",
        channel_id: null,
        name: "別の投稿者",
        handle: "other",
        profile_photo_url: "https://example.test/other.jpg",
      },
    });
    vi.mocked(getStreamComments).mockResolvedValue({
      data: [otherComment],
      next_before_id: null,
      has_more: false,
    });
    const { rerender } = render(
      <StreamComments streamId={3} streamChannelId={7} session={channelSession(7)} />
    );

    fireEvent.keyDown(await screen.findByRole("button", { name: "コメントメニュー" }), {
      key: "Enter",
      code: "Enter",
    });
    expect(await screen.findByRole("menuitem", { name: "削除" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "編集" })).not.toBeInTheDocument();

    rerender(<StreamComments streamId={3} streamChannelId={7} session={channelSession(8)} />);
    await waitFor(() =>
      expect(screen.queryByRole("menuitem", { name: "削除" })).not.toBeInTheDocument()
    );
  });

  it("does not enable whitespace-only submissions", async () => {
    render(<StreamComments streamId={3} streamChannelId={7} session={session} />);
    await screen.findByText("最初のコメント");
    fireEvent.change(screen.getByRole("textbox", { name: "コメント" }), {
      target: { value: "   " },
    });
    expect(screen.getByRole("button", { name: "コメント" })).toBeDisabled();
  });
});
