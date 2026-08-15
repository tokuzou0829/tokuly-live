"use client";

import React, { useEffect, useState } from "react";
import {
  Flag,
  Heart,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Reply as ReplyIcon,
  Trash2,
  X,
} from "lucide-react";
import { signIn } from "next-auth/react";
import type { Session } from "next-auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  CommentApiError,
  createStreamComment,
  deleteStreamComment,
  getStreamCommentReplies,
  getStreamComments,
  updateStreamComment,
} from "@/requests/comments";
import type { StreamComment } from "@/types/comment";

const MAX_COMMENT_LENGTH = 1000;
const MAX_INDENT_DEPTH = 3;

type Props = {
  streamId: number;
  session: Session | null;
  streamChannelId: number;
  creatorName: string;
  creatorIconUrl: string | null;
};

function errorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof CommentApiError)) return fallback;
  return Object.values(error.fields).flat()[0] ?? error.message;
}

function formatCommentDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function mergeUnique(previous: StreamComment[], incoming: StreamComment[]): StreamComment[] {
  const comments = new Map<number, StreamComment>();
  [...incoming, ...previous].forEach((comment) => comments.set(comment.id, comment));
  return Array.from(comments.values()).sort((a, b) => a.id - b.id);
}

function updateCommentTree(
  comments: StreamComment[],
  commentId: number,
  update: (comment: StreamComment) => StreamComment
): StreamComment[] {
  return comments.map((comment) => {
    if (comment.id === commentId) return update(comment);
    if (!comment.replies?.length) return comment;
    const replies = updateCommentTree(comment.replies, commentId, update);
    return replies === comment.replies ? comment : { ...comment, replies };
  });
}

function replaceCommentTree(
  comments: StreamComment[],
  commentId: number,
  replacement: StreamComment
): StreamComment[] {
  return updateCommentTree(comments, commentId, (comment) => ({
    ...comment,
    ...replacement,
    replies: comment.replies,
    has_more_replies: comment.has_more_replies,
    next_reply_after_id: comment.next_reply_after_id,
  }));
}

function removeCommentTree(
  comments: StreamComment[],
  commentId: number
): { comments: StreamComment[]; removed: boolean } {
  let removed = false;
  const next: StreamComment[] = [];

  for (const comment of comments) {
    if (comment.id === commentId) {
      removed = true;
      continue;
    }

    if (!comment.replies?.length) {
      next.push(comment);
      continue;
    }

    const removedDirectReply = comment.replies.some((reply) => reply.id === commentId);
    const childResult = removeCommentTree(comment.replies, commentId);
    if (!childResult.removed) {
      next.push(comment);
      continue;
    }

    removed = true;
    next.push({
      ...comment,
      replies: childResult.comments,
      reply_count: removedDirectReply ? Math.max(0, comment.reply_count - 1) : comment.reply_count,
    });
  }

  return { comments: next, removed };
}

export function StreamComments({
  streamId,
  session,
  streamChannelId,
  creatorName,
  creatorIconUrl,
}: Props) {
  const [comments, setComments] = useState<StreamComment[]>([]);
  const [nextBeforeId, setNextBeforeId] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<StreamComment | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyCommentIds, setBusyCommentIds] = useState<Set<number>>(() => new Set());
  const [loadingReplyIds, setLoadingReplyIds] = useState<Set<number>>(() => new Set());
  const [expandedReplyIds, setExpandedReplyIds] = useState<Set<number>>(() => new Set());
  const [error, setError] = useState("");
  const [actionErrors, setActionErrors] = useState<Record<number, string>>({});
  const token = session?.user?.access_token;
  const postingIdentity = session?.activePostingIdentity;
  const postingChannelId =
    postingIdentity?.type === "channel" ? postingIdentity.channelId : undefined;
  const identityKey =
    postingIdentity?.type === "channel"
      ? `channel:${postingIdentity.channelId}`
      : postingIdentity?.type === "user"
        ? `user:${postingIdentity.accountId}`
        : "guest";
  const canModerate = Boolean(
    token &&
    postingIdentity?.type === "channel" &&
    Number(postingIdentity.channelId) === Number(streamChannelId)
  );

  function isCurrentAuthor(comment: StreamComment): boolean {
    if (!postingIdentity) return false;
    if (comment.author.type === "channel") {
      return (
        postingIdentity.type === "channel" &&
        comment.author.channel_id != null &&
        Number(comment.author.channel_id) === Number(postingIdentity.channelId)
      );
    }
    return (
      postingIdentity.type === "user" &&
      comment.author.id != null &&
      Number(comment.author.id) === Number(postingIdentity.accountId)
    );
  }

  function canDeleteComment(comment: StreamComment): boolean {
    return Boolean(token && (isCurrentAuthor(comment) || canModerate));
  }

  function setCommentBusy(commentId: number, busy: boolean) {
    setBusyCommentIds((previous) => {
      const next = new Set(previous);
      if (busy) next.add(commentId);
      else next.delete(commentId);
      return next;
    });
  }

  function setRepliesLoading(commentId: number, busy: boolean) {
    setLoadingReplyIds((previous) => {
      const next = new Set(previous);
      if (busy) next.add(commentId);
      else next.delete(commentId);
      return next;
    });
  }

  function setActionError(commentId: number, message: string) {
    setActionErrors((previous) => {
      const next = { ...previous };
      if (message) next[commentId] = message;
      else delete next[commentId];
      return next;
    });
  }

  useEffect(() => {
    setEditingId(null);
    setEditingContent("");
    setReplyingToId(null);
    setReplyContent("");
    setDeleteTarget(null);
    setDeleteError("");
  }, [identityKey]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    setExpandedReplyIds(new Set());
    getStreamComments(streamId)
      .then((page) => {
        if (controller.signal.aborted) return;
        setComments(page.data);
        setNextBeforeId(page.next_before_id);
        setHasMore(page.has_more);
      })
      .catch((caught) => {
        if (!controller.signal.aborted) {
          setError(errorMessage(caught, "コメントを読み込めませんでした。"));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [streamId]);

  async function loadMore() {
    if (loadingMore || !hasMore || nextBeforeId == null) return;
    setLoadingMore(true);
    setError("");
    try {
      const page = await getStreamComments(streamId, nextBeforeId);
      setComments((previous) => mergeUnique(previous, page.data));
      setNextBeforeId(page.next_before_id);
      setHasMore(page.has_more);
    } catch (caught) {
      setError(errorMessage(caught, "過去のコメントを読み込めませんでした。"));
    } finally {
      setLoadingMore(false);
    }
  }

  function setRepliesExpanded(commentId: number, expanded: boolean) {
    setExpandedReplyIds((previous) => {
      const next = new Set(previous);
      if (expanded) next.add(commentId);
      else next.delete(commentId);
      return next;
    });
  }

  async function loadReplies(comment: StreamComment, expandAfterLoad = false) {
    if (loadingReplyIds.has(comment.id)) return;
    setRepliesLoading(comment.id, true);
    setActionError(comment.id, "");
    try {
      const page = await getStreamCommentReplies(streamId, comment.id, comment.next_reply_after_id);
      setComments((previous) =>
        updateCommentTree(previous, comment.id, (current) => ({
          ...current,
          replies: mergeUnique(current.replies ?? [], page.data),
          next_reply_after_id: page.next_after_id,
          has_more_replies: page.has_more,
        }))
      );
      if (expandAfterLoad) setRepliesExpanded(comment.id, true);
    } catch (caught) {
      setActionError(comment.id, errorMessage(caught, "返信を読み込めませんでした。"));
    } finally {
      setRepliesLoading(comment.id, false);
    }
  }

  function toggleReplies(comment: StreamComment) {
    if (expandedReplyIds.has(comment.id)) {
      setRepliesExpanded(comment.id, false);
      return;
    }
    if (comment.replies?.length) {
      setRepliesExpanded(comment.id, true);
      return;
    }
    void loadReplies(comment, true);
  }

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = content.trim();
    if (!token || !value || value.length > MAX_COMMENT_LENGTH) return;
    setSubmitting(true);
    setError("");
    try {
      const created = await createStreamComment(
        streamId,
        { content: value, channelId: postingChannelId },
        token
      );
      setComments((previous) => mergeUnique(previous, [created]));
      setContent("");
    } catch (caught) {
      setError(errorMessage(caught, "コメントを投稿できませんでした。"));
    } finally {
      setSubmitting(false);
    }
  }

  function startReplying(commentId: number) {
    setEditingId(null);
    setEditingContent("");
    setReplyingToId(commentId);
    setReplyContent("");
    setActionError(commentId, "");
  }

  async function submitReply(event: React.FormEvent<HTMLFormElement>, parent: StreamComment) {
    event.preventDefault();
    const value = replyContent.trim();
    if (!token || replyingToId !== parent.id || !value || value.length > MAX_COMMENT_LENGTH) return;
    setCommentBusy(parent.id, true);
    setActionError(parent.id, "");
    try {
      const created = await createStreamComment(
        streamId,
        { content: value, parentCommentId: parent.id, channelId: postingChannelId },
        token
      );
      setComments((previous) =>
        updateCommentTree(previous, parent.id, (comment) => ({
          ...comment,
          replies: mergeUnique(comment.replies ?? [], [created]),
          reply_count: comment.reply_count + 1,
        }))
      );
      setRepliesExpanded(parent.id, true);
      setReplyingToId(null);
      setReplyContent("");
    } catch (caught) {
      setActionError(parent.id, errorMessage(caught, "返信を投稿できませんでした。"));
    } finally {
      setCommentBusy(parent.id, false);
    }
  }

  function startEditing(comment: StreamComment) {
    if (!token || !isCurrentAuthor(comment)) return;
    setReplyingToId(null);
    setReplyContent("");
    setEditingId(comment.id);
    setEditingContent(comment.content);
    setActionError(comment.id, "");
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>, comment: StreamComment) {
    event.preventDefault();
    const value = editingContent.trim();
    if (
      !token ||
      editingId !== comment.id ||
      !isCurrentAuthor(comment) ||
      !value ||
      value.length > MAX_COMMENT_LENGTH
    ) {
      return;
    }
    setCommentBusy(comment.id, true);
    setActionError(comment.id, "");
    try {
      const updated = await updateStreamComment(streamId, comment.id, value, token);
      setComments((previous) => replaceCommentTree(previous, comment.id, updated));
      setEditingId(null);
      setEditingContent("");
    } catch (caught) {
      setActionError(comment.id, errorMessage(caught, "コメントを編集できませんでした。"));
    } finally {
      setCommentBusy(comment.id, false);
    }
  }

  function requestCommentDeletion(comment: StreamComment) {
    if (!token || !canDeleteComment(comment)) return;
    setDeleteError("");
    setDeleteTarget(comment);
  }

  async function confirmCommentDeletion() {
    const comment = deleteTarget;
    if (!comment || !token || !canDeleteComment(comment)) {
      setDeleteTarget(null);
      return;
    }
    setCommentBusy(comment.id, true);
    setDeleteError("");
    try {
      await deleteStreamComment(streamId, comment.id, token);
      setComments((previous) => removeCommentTree(previous, comment.id).comments);
      if (editingId === comment.id) setEditingId(null);
      if (replyingToId === comment.id) setReplyingToId(null);
      setDeleteTarget(null);
    } catch (caught) {
      setDeleteError(errorMessage(caught, "コメントを削除できませんでした。"));
    } finally {
      setCommentBusy(comment.id, false);
    }
  }

  function renderCommentBranch(comment: StreamComment, depth: number): React.ReactNode {
    const replies = comment.replies ?? [];
    const isAuthor = isCurrentAuthor(comment);
    const canDelete = canDeleteComment(comment);
    const isBusy = busyCommentIds.has(comment.id);
    const isLoadingReplies = loadingReplyIds.has(comment.id);
    const repliesExpanded = expandedReplyIds.has(comment.id);
    const hasReplies = comment.reply_count > 0 || replies.length > 0;
    const canLoadReplies = comment.has_more_replies ?? comment.reply_count > replies.length;

    return (
      <li key={comment.id} className={depth === 0 ? "py-3" : "pb-3"}>
        <div className="flex gap-3">
          <img
            src={comment.author.profile_photo_url}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full bg-muted object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="font-semibold">{comment.author.name}</span>
              <time className="text-xs text-muted-foreground" dateTime={comment.created_at}>
                {formatCommentDate(comment.created_at)}
              </time>
              {comment.edited_at && (
                <span className="text-xs text-muted-foreground">（編集済み）</span>
              )}
            </div>

            {editingId === comment.id ? (
              <form onSubmit={(event) => saveEdit(event, comment)} className="mt-2">
                <Textarea
                  aria-label="コメントを編集"
                  value={editingContent}
                  maxLength={MAX_COMMENT_LENGTH}
                  onChange={(event) => setEditingContent(event.target.value)}
                  className="min-h-[80px] resize-y"
                  autoFocus
                />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {editingContent.length}/{MAX_COMMENT_LENGTH}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingId(null)}
                      disabled={isBusy}
                    >
                      <X className="mr-1 h-4 w-4" aria-hidden="true" />
                      キャンセル
                    </Button>
                    <Button type="submit" size="sm" disabled={isBusy || !editingContent.trim()}>
                      {isBusy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                      保存
                    </Button>
                  </div>
                </div>
              </form>
            ) : (
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">
                {comment.content}
              </p>
            )}

            {editingId !== comment.id && (
              <div className="mt-2 flex flex-wrap items-center gap-1">
                {token && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground"
                    onClick={() => startReplying(comment.id)}
                    disabled={isBusy}
                  >
                    <ReplyIcon className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    返信
                  </Button>
                )}
                {comment.creator_reacted_at !== null && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span
                        className="relative mx-1 inline-flex h-7 w-7 shrink-0"
                        role="img"
                        aria-label={`${creatorName}さんが反応`}
                        tabIndex={0}
                      >
                        {creatorIconUrl ? (
                          <img
                            src={creatorIconUrl}
                            alt=""
                            className="h-6 w-6 rounded-full object-cover"
                          />
                        ) : (
                          <span
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-800 text-[10px] font-bold text-white"
                            aria-hidden="true"
                          >
                            {creatorName.slice(0, 1)}
                          </span>
                        )}
                        <Heart
                          className="absolute bottom-0 right-0 h-3.5 w-3.5 text-rose-500"
                          fill="currentColor"
                          aria-hidden="true"
                        />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{creatorName}さんが反応</TooltipContent>
                  </Tooltip>
                )}
                {isAuthor && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-muted-foreground"
                    onClick={() => startEditing(comment)}
                    disabled={isBusy}
                  >
                    <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                    編集
                  </Button>
                )}
              </div>
            )}

            {replyingToId === comment.id && (
              <form onSubmit={(event) => submitReply(event, comment)} className="mt-2">
                <Textarea
                  aria-label="返信を入力"
                  value={replyContent}
                  maxLength={MAX_COMMENT_LENGTH}
                  onChange={(event) => setReplyContent(event.target.value)}
                  placeholder={`${comment.author.name}さんに返信`}
                  className="min-h-[72px] resize-y"
                  autoFocus
                />
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">
                    {replyContent.length}/{MAX_COMMENT_LENGTH}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyingToId(null)}
                      disabled={isBusy}
                    >
                      キャンセル
                    </Button>
                    <Button type="submit" size="sm" disabled={isBusy || !replyContent.trim()}>
                      {isBusy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
                      返信する
                    </Button>
                  </div>
                </div>
              </form>
            )}

            {hasReplies && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 h-8 px-2 text-muted-foreground"
                onClick={() => toggleReplies(comment)}
                disabled={isLoadingReplies}
              >
                {isLoadingReplies && (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                )}
                {repliesExpanded ? "返信を非表示" : `返信${comment.reply_count}件を表示`}
              </Button>
            )}

            {repliesExpanded && canLoadReplies && replies.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 h-8 px-2 text-muted-foreground"
                onClick={() => loadReplies(comment)}
                disabled={isLoadingReplies}
              >
                {isLoadingReplies && (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                )}
                返信をさらに表示
              </Button>
            )}

            {actionErrors[comment.id] && (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {actionErrors[comment.id]}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground"
                aria-label="コメントメニュー"
                disabled={isBusy}
              >
                {isBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <MoreHorizontal className="h-5 w-5" aria-hidden="true" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href="https://tokuly.com/support/report" target="_blank" rel="noreferrer">
                  <Flag className="mr-2 h-4 w-4" aria-hidden="true" />
                  報告
                </a>
              </DropdownMenuItem>
              {canDelete && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => requestCommentDeletion(comment)}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
                  削除
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {repliesExpanded && replies.length > 0 && (
          <ol
            className={`mt-3 space-y-1 border-l border-muted-foreground/25 ${
              depth < MAX_INDENT_DEPTH ? "ml-5 pl-3" : "ml-1 pl-2"
            }`}
          >
            {replies.map((reply) => renderCommentBranch(reply, depth + 1))}
          </ol>
        )}
      </li>
    );
  }

  return (
    <section aria-labelledby="stream-comments-heading" className="mt-6 pb-8 pt-5">
      <div className="mb-4 flex items-center gap-2">
        <MessageCircle className="h-5 w-5" aria-hidden="true" />
        <h2 id="stream-comments-heading" className="text-xl font-bold">
          {loading ? "コメント" : `${comments.length}件のコメント`}
        </h2>
      </div>

      {session?.user && token ? (
        <form onSubmit={submitComment} className="mb-6">
          <div className="flex items-start gap-3">
            {postingIdentity?.profilePhotoUrl ? (
              <img
                src={postingIdentity.profilePhotoUrl}
                alt=""
                className="mt-1 h-9 w-9 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="mt-1 h-9 w-9 shrink-0 rounded-full bg-muted" aria-hidden="true" />
            )}
            <div className="min-w-0 flex-1">
              <Textarea
                aria-label="コメント"
                value={content}
                maxLength={MAX_COMMENT_LENGTH}
                onChange={(event) => setContent(event.target.value)}
                placeholder="動画の感想を共有しよう！"
                className="min-h-[88px] resize-y"
              />
              <div className="mt-2 flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">
                  {content.length}/{MAX_COMMENT_LENGTH}
                </span>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting || !content.trim() || content.length > MAX_COMMENT_LENGTH}
                >
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  コメント
                </Button>
              </div>
            </div>
          </div>
        </form>
      ) : (
        <div className="mb-6 rounded-lg border bg-muted/40 p-4 text-center">
          <p className="mb-3 text-sm text-muted-foreground">
            コメントを投稿するにはログインしてください。
          </p>
          <Button type="button" variant="outline" size="sm" onClick={() => signIn("tokuly")}>
            ログイン
          </Button>
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-10" aria-label="コメントを読み込み中">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
        </div>
      ) : comments.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          まだコメントはありません。最初のコメントを投稿してみましょう。
        </p>
      ) : (
        <div>
          {hasMore && (
            <div className="mb-4 text-center">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                過去のコメントを表示
              </Button>
            </div>
          )}
          <ol className="space-y-2">
            {comments.map((comment) => renderCommentBranch(comment, 0))}
          </ol>
        </div>
      )}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !(deleteTarget && busyCommentIds.has(deleteTarget.id))) {
            setDeleteTarget(null);
            setDeleteError("");
          }
        }}
      >
        <DialogContent
          className="w-[calc(100%-2rem)] max-w-md"
          showCloseButton={!(deleteTarget && busyCommentIds.has(deleteTarget.id))}
        >
          <DialogHeader>
            <DialogTitle>このコメントを削除しますか？</DialogTitle>
            <DialogDescription className="pt-2 leading-6">
              この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          {deleteError && (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {deleteError}
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button
                type="button"
                variant="outline"
                disabled={Boolean(deleteTarget && busyCommentIds.has(deleteTarget.id))}
              >
                キャンセル
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmCommentDeletion()}
              disabled={Boolean(deleteTarget && busyCommentIds.has(deleteTarget.id))}
            >
              {deleteTarget && busyCommentIds.has(deleteTarget.id) ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
