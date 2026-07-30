"use client";

import React, { useEffect, useState } from "react";
import { Loader2, MessageCircle, Pencil, Trash2, X } from "lucide-react";
import { signIn } from "next-auth/react";
import type { Session } from "next-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CommentApiError,
  createStreamComment,
  deleteStreamComment,
  getStreamComments,
  updateStreamComment,
} from "@/requests/comments";
import type { StreamComment } from "@/types/comment";

const MAX_COMMENT_LENGTH = 1000;

type Props = {
  streamId: number;
  session: Session | null;
  isChannelOwner?: boolean;
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

export function StreamComments({ streamId, session, isChannelOwner = false }: Props) {
  const [comments, setComments] = useState<StreamComment[]>([]);
  const [nextBeforeId, setNextBeforeId] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyCommentId, setBusyCommentId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const token = session?.user?.access_token;
  const currentUserId = session?.user?.id;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
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

  async function submitComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = content.trim();
    if (!token || !value || value.length > MAX_COMMENT_LENGTH) return;
    setSubmitting(true);
    setError("");
    try {
      const created = await createStreamComment(streamId, value, token);
      setComments((previous) => mergeUnique(previous, [created]));
      setContent("");
    } catch (caught) {
      setError(errorMessage(caught, "コメントを投稿できませんでした。"));
    } finally {
      setSubmitting(false);
    }
  }

  function startEditing(comment: StreamComment) {
    setEditingId(comment.id);
    setEditingContent(comment.content);
    setError("");
  }

  async function saveEdit(event: React.FormEvent<HTMLFormElement>, commentId: number) {
    event.preventDefault();
    const value = editingContent.trim();
    if (!token || !value || value.length > MAX_COMMENT_LENGTH) return;
    setBusyCommentId(commentId);
    setError("");
    try {
      const updated = await updateStreamComment(streamId, commentId, value, token);
      setComments((previous) =>
        previous.map((comment) => (comment.id === commentId ? updated : comment))
      );
      setEditingId(null);
      setEditingContent("");
    } catch (caught) {
      setError(errorMessage(caught, "コメントを編集できませんでした。"));
    } finally {
      setBusyCommentId(null);
    }
  }

  async function removeComment(commentId: number) {
    if (!token || !window.confirm("このコメントを削除しますか？")) return;
    setBusyCommentId(commentId);
    setError("");
    try {
      await deleteStreamComment(streamId, commentId, token);
      setComments((previous) => previous.filter((comment) => comment.id !== commentId));
      if (editingId === commentId) setEditingId(null);
    } catch (caught) {
      setError(errorMessage(caught, "コメントを削除できませんでした。"));
    } finally {
      setBusyCommentId(null);
    }
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
            {session.user.image ? (
              <img
                src={session.user.image}
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
          <ol className="divide-y">
            {comments.map((comment) => {
              const isAuthor =
                currentUserId != null &&
                comment.author.id != null &&
                Number(currentUserId) === Number(comment.author.id);
              const canDelete = Boolean(token && (isAuthor || isChannelOwner));
              const isBusy = busyCommentId === comment.id;

              return (
                <li key={comment.id} className="flex gap-3 py-4">
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
                      <form onSubmit={(event) => saveEdit(event, comment.id)} className="mt-2">
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
                            <Button
                              type="submit"
                              size="sm"
                              disabled={isBusy || !editingContent.trim()}
                            >
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

                    {editingId !== comment.id && (isAuthor || canDelete) && (
                      <div className="mt-2 flex gap-1">
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
                        {canDelete && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-muted-foreground hover:text-destructive"
                            onClick={() => removeComment(comment.id)}
                            disabled={isBusy}
                          >
                            {isBusy ? (
                              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                            )}
                            削除
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </section>
  );
}
