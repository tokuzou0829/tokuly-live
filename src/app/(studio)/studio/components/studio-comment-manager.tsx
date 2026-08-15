"use client";

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
import { Input } from "@/components/ui/input";
import { deleteStudioComment, getStudioCommentReplies } from "@/requests/studio";
import type {
  StudioComment,
  StudioCommentPage,
  StudioCommentStream,
  StudioStream,
} from "@/types/studio";
import { ChevronDown, Loader2, Reply, Search, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useState } from "react";
import StudioCommentReactionButton from "./studio-comment-reaction-button";

type Filters = {
  query: string;
  author: string;
  authorType: "" | "user" | "channel";
  from: string;
  to: string;
};

function localDateTime(value: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function mergeComments(previous: StudioComment[], incoming: StudioComment[]): StudioComment[] {
  const comments = new Map(previous.map((comment) => [comment.id, comment]));
  incoming.forEach((comment) => comments.set(comment.id, comment));
  return Array.from(comments.values()).sort((a, b) => a.id - b.id);
}

function updateTree(
  comments: StudioComment[],
  id: number,
  update: (comment: StudioComment) => StudioComment
): StudioComment[] {
  return comments.map((comment) => {
    if (comment.id === id) return update(comment);
    if (!comment.replies?.length) return comment;
    return { ...comment, replies: updateTree(comment.replies, id, update) };
  });
}

function commentStream(
  comment: StudioComment,
  selected: StudioStream | null
): StudioCommentStream | null {
  if (comment.stream) return comment.stream;
  if (!selected) return null;
  return {
    id: selected.id,
    title: selected.title,
    type: selected.type,
    status: selected.status,
    stream_key: selected.stream_key,
    thumbnail_url: selected.thumbnail_url,
  };
}

export default function StudioCommentManager({
  result,
  token,
  view,
  stream,
  filters,
}: {
  result: StudioCommentPage;
  token: string;
  view: "flat" | "threaded";
  stream: StudioStream | null;
  filters: Filters;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [comments, setComments] = useState(result.data);
  const [filterError, setFilterError] = useState("");
  const [loadingReplyIds, setLoadingReplyIds] = useState<Set<number>>(new Set());
  const [replyErrors, setReplyErrors] = useState<Record<number, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<{
    comment: StudioComment;
    streamId: number;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => setComments(result.data), [result.data]);

  const href = (changes: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    Object.entries(changes).forEach(([key, value]) => {
      if (value === undefined || value === "") params.delete(key);
      else params.set(key, String(value));
    });
    const query = params.toString();
    return query ? `/studio/comments?${query}` : "/studio/comments";
  };

  function submitFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilterError("");
    const form = new FormData(event.currentTarget);
    const fromValue = String(form.get("from") ?? "");
    const toValue = String(form.get("to") ?? "");
    const from = fromValue ? new Date(fromValue) : null;
    const to = toValue ? new Date(toValue) : null;
    if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) {
      setFilterError("日時の形式を確認してください。");
      return;
    }
    if (from && to && from > to) {
      setFilterError("終了日時は開始日時以降を指定してください。");
      return;
    }
    router.push(
      href({
        query: String(form.get("query") ?? "").trim(),
        author: String(form.get("author") ?? "").trim(),
        author_type: String(form.get("author_type") ?? ""),
        from: from?.toISOString() ?? "",
        to: to?.toISOString() ?? "",
        page: undefined,
      })
    );
  }

  async function loadReplies(comment: StudioComment, streamId: number) {
    if (loadingReplyIds.has(comment.id)) return;
    setLoadingReplyIds((previous) => new Set(previous).add(comment.id));
    setReplyErrors((previous) => ({ ...previous, [comment.id]: "" }));
    try {
      const page = await getStudioCommentReplies(
        streamId,
        comment.id,
        token,
        comment.next_reply_after_id
      );
      setComments((previous) =>
        updateTree(previous, comment.id, (current) => ({
          ...current,
          replies: mergeComments(current.replies ?? [], page.data),
          has_more_replies: page.has_more,
          next_reply_after_id: page.next_after_id,
        }))
      );
    } catch (caught) {
      setReplyErrors((previous) => ({
        ...previous,
        [comment.id]: caught instanceof Error ? caught.message : "返信を読み込めませんでした。",
      }));
    } finally {
      setLoadingReplyIds((previous) => {
        const next = new Set(previous);
        next.delete(comment.id);
        return next;
      });
    }
  }

  async function remove() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteStudioComment(deleteTarget.streamId, deleteTarget.comment.id, token);
      setDeleteTarget(null);
      router.refresh();
    } catch (caught) {
      setDeleteError(caught instanceof Error ? caught.message : "コメントを削除できませんでした。");
    } finally {
      setDeleting(false);
    }
  }

  function renderComment(
    comment: StudioComment,
    depth = 0,
    inheritedStream?: StudioCommentStream | null
  ): React.ReactNode {
    const currentStream = comment.stream ?? inheritedStream ?? commentStream(comment, stream);
    const replies = comment.replies ?? [];
    const hasMoreReplies = comment.has_more_replies ?? comment.reply_count > replies.length;
    const loadingReplies = loadingReplyIds.has(comment.id);

    return (
      <li
        key={comment.id}
        className={
          depth === 0 ? "p-4 md:p-5" : "mt-3 border-l-2 border-[var(--studio-border)] pl-4"
        }
      >
        {depth === 0 && currentStream && !stream && (
          <Link
            href={href({ stream_id: currentStream.id, page: undefined })}
            className="mb-3 flex w-fit max-w-full items-center gap-3 rounded-lg bg-[var(--studio-subtle)] p-2 pr-3 hover:bg-[var(--studio-active)]"
          >
            <div className="h-10 w-16 shrink-0 overflow-hidden rounded bg-black">
              {currentStream.thumbnail_url && (
                <img
                  src={currentStream.thumbnail_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{currentStream.title}</span>
              <span className="block text-xs text-[var(--studio-muted)]">
                {currentStream.type === "live" ? "ライブ配信" : "動画"}
              </span>
            </span>
          </Link>
        )}
        <div className="flex gap-3">
          {comment.author.profile_photo_url ? (
            <img
              src={comment.author.profile_photo_url}
              alt=""
              className="h-9 w-9 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--studio-fg)] text-xs font-bold text-[var(--studio-surface)]">
              {comment.author.name.slice(0, 1)}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-semibold">{comment.author.name}</span>
              <span className="text-xs text-[var(--studio-muted)]">@{comment.author.handle}</span>
              {comment.author.type === "channel" && (
                <span className="rounded bg-[var(--studio-subtle)] px-1.5 py-0.5 text-[10px] font-semibold">
                  チャンネル
                </span>
              )}
              {view === "flat" && comment.parent_comment_id && (
                <span className="flex items-center gap-1 text-xs text-[var(--studio-muted)]">
                  <Reply className="h-3 w-3" />
                  返信
                </span>
              )}
              <time dateTime={comment.created_at} className="text-xs text-[var(--studio-muted)]">
                {formatDate(comment.created_at)}
              </time>
              {comment.edited_at && (
                <span className="text-xs text-[var(--studio-muted)]">編集済み</span>
              )}
            </div>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6">
              {comment.content}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {view === "threaded" && (comment.reply_count > 0 || replies.length > 0) && (
                <span className="text-xs font-semibold text-[var(--studio-muted)]">
                  返信 {comment.reply_count}件
                </span>
              )}
              {currentStream && (
                <StudioCommentReactionButton
                  streamId={currentStream.id}
                  commentId={comment.id}
                  token={token}
                  initialReactedAt={comment.creator_reacted_at}
                />
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() =>
                  currentStream && setDeleteTarget({ comment, streamId: currentStream.id })
                }
                disabled={!currentStream}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                削除
              </Button>
            </div>
            {view === "threaded" && replies.length > 0 && (
              <ul>{replies.map((reply) => renderComment(reply, depth + 1, currentStream))}</ul>
            )}
            {view === "threaded" && hasMoreReplies && currentStream && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => void loadReplies(comment, currentStream.id)}
                disabled={loadingReplies}
              >
                {loadingReplies ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ChevronDown className="mr-2 h-4 w-4" />
                )}
                返信をさらに表示
              </Button>
            )}
            {replyErrors[comment.id] && (
              <p role="alert" className="mt-2 text-sm font-semibold">
                {replyErrors[comment.id]}
              </p>
            )}
          </div>
        </div>
      </li>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="studio-title">コメント</h1>
          {stream && (
            <p className="mt-1 text-sm text-[var(--studio-muted)]">「{stream.title}」のコメント</p>
          )}
        </div>
        {stream && (
          <Button asChild variant="outline" size="sm">
            <Link href="/studio/comments">
              <X className="mr-2 h-4 w-4" />
              配信の絞り込みを解除
            </Link>
          </Button>
        )}
      </div>

      <form onSubmit={submitFilters} className="studio-card space-y-4 p-4">
        <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-3 h-4 w-4 text-[var(--studio-muted)]" />
            <Input
              name="query"
              defaultValue={filters.query}
              maxLength={1000}
              placeholder="コメント本文を検索"
              className="pl-9"
            />
          </div>
          <Input
            name="author"
            defaultValue={filters.author}
            maxLength={255}
            placeholder="投稿者名またはhandle"
          />
          <select
            name="author_type"
            defaultValue={filters.authorType}
            className="h-10 rounded-md border border-[var(--studio-border)] px-3 text-sm"
          >
            <option value="">すべての投稿者</option>
            <option value="user">ユーザー</option>
            <option value="channel">チャンネル</option>
          </select>
          <label className="grid gap-1 text-xs font-semibold text-[var(--studio-muted)]">
            開始日時
            <Input name="from" type="datetime-local" defaultValue={localDateTime(filters.from)} />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-[var(--studio-muted)]">
            終了日時
            <Input name="to" type="datetime-local" defaultValue={localDateTime(filters.to)} />
          </label>
          <div className="flex items-end gap-2 xl:col-span-2">
            <Button type="submit">絞り込む</Button>
            <Button asChild type="button" variant="outline">
              <Link href={stream ? `/studio/comments?stream_id=${stream.id}` : "/studio/comments"}>
                条件をクリア
              </Link>
            </Button>
          </div>
        </div>
        {filterError && (
          <p role="alert" className="text-sm font-semibold">
            {filterError}
          </p>
        )}
      </form>

      <div className="studio-card flex gap-1 overflow-x-auto p-3">
        <Link
          href={href({ view: "threaded", page: undefined })}
          className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${view === "threaded" ? "bg-[var(--studio-active)] text-[var(--studio-accent)]" : "hover:bg-[var(--studio-subtle)]"}`}
        >
          スレッド
        </Link>
        <Link
          href={href({ view: "flat", page: undefined })}
          className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold ${view === "flat" ? "bg-[var(--studio-active)] text-[var(--studio-accent)]" : "hover:bg-[var(--studio-subtle)]"}`}
        >
          新しい順
        </Link>
      </div>

      <section className="studio-card overflow-hidden">
        {comments.length > 0 ? (
          <ul className="divide-y divide-[var(--studio-border)]">
            {comments.map((comment) => renderComment(comment))}
          </ul>
        ) : (
          <p className="p-10 text-center text-sm text-[var(--studio-muted)]">
            該当するコメントはありません
          </p>
        )}
        {result.meta.last_page > 1 && (
          <div className="flex items-center justify-end gap-2 border-t border-[var(--studio-border)] p-4">
            <Button asChild variant="outline" size="sm">
              <Link
                href={
                  result.meta.current_page > 1 ? href({ page: result.meta.current_page - 1 }) : "#"
                }
                aria-disabled={result.meta.current_page <= 1}
                className={result.meta.current_page <= 1 ? "pointer-events-none opacity-50" : ""}
              >
                前へ
              </Link>
            </Button>
            <span className="text-sm">
              {result.meta.current_page} / {result.meta.last_page}
            </span>
            <Button asChild variant="outline" size="sm">
              <Link
                href={
                  result.meta.current_page < result.meta.last_page
                    ? href({ page: result.meta.current_page + 1 })
                    : "#"
                }
                aria-disabled={result.meta.current_page >= result.meta.last_page}
                className={
                  result.meta.current_page >= result.meta.last_page
                    ? "pointer-events-none opacity-50"
                    : ""
                }
              >
                次へ
              </Link>
            </Button>
          </div>
        )}
      </section>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && !deleting && setDeleteTarget(null)}
      >
        <DialogContent className="w-[calc(100%-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>このコメントを削除しますか？</DialogTitle>
            <DialogDescription className="pt-2 leading-6">
              このコメント以下のすべての返信も削除されます。削除したコメントは復元できません。
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <p className="max-h-32 overflow-auto rounded-lg bg-[var(--studio-subtle)] p-3 text-sm">
              {deleteTarget.comment.content}
            </p>
          )}
          {deleteError && (
            <p role="alert" className="rounded-lg border border-current p-3 text-sm">
              {deleteError}
            </p>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={deleting}>
                キャンセル
              </Button>
            </DialogClose>
            <Button type="button" onClick={() => void remove()} disabled={deleting}>
              {deleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
