"use client";

import { Button } from "@/components/ui/button";
import type { StudioCommentPage } from "@/types/studio";
import { Reply } from "lucide-react";
import Link from "next/link";
import React from "react";
import StudioCommentReactionButton from "./studio-comment-reaction-button";

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function StudioLatestCommentsCard({
  streamId,
  token,
  initial,
}: {
  streamId: number;
  token: string;
  initial: StudioCommentPage | null;
}) {
  const comments = initial?.data ?? [];
  const error = initial ? "" : "最新コメントを読み込めませんでした。";

  return (
    <section
      className="studio-card min-w-0 max-w-full overflow-hidden"
      aria-labelledby="latest-comments-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--studio-border)] p-4 sm:p-5">
        <div>
          <h2 id="latest-comments-heading" className="font-bold">
            最新のコメント
          </h2>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href={`/studio/comments?view=flat&stream_id=${streamId}`}>コメントを管理</Link>
        </Button>
      </div>

      {error && (
        <div className="p-4 sm:p-5">
          <p role="alert" className="rounded-lg bg-[var(--studio-subtle)] p-3 text-sm">
            {error}
          </p>
        </div>
      )}

      {!error && comments.length === 0 && (
        <p className="p-8 text-center text-sm text-[var(--studio-muted)]">
          コメントはまだありません
        </p>
      )}

      {!error && comments.length > 0 && (
        <ul className="divide-y divide-[var(--studio-border)]">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3 p-4 sm:px-5">
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
                  <span className="text-xs text-[var(--studio-muted)]">
                    @{comment.author.handle}
                  </span>
                  {comment.parent_comment_id && (
                    <span className="flex items-center gap-1 text-xs text-[var(--studio-muted)]">
                      <Reply className="h-3 w-3" />
                      返信
                    </span>
                  )}
                  <time
                    dateTime={comment.created_at}
                    className="text-xs text-[var(--studio-muted)]"
                  >
                    {formatDate(comment.created_at)}
                  </time>
                </div>
                <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-sm leading-6">
                  {comment.content}
                </p>
              </div>
              <StudioCommentReactionButton
                streamId={streamId}
                commentId={comment.id}
                token={token}
                initialReactedAt={comment.creator_reacted_at}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
