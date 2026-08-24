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
import { deleteStudioClip } from "@/requests/studio";
import type { ClipPage, ClipResource } from "@/types/clip";
import { BarChart3, ExternalLink, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import React from "react";

function DeleteClipButton({
  clip,
  channelId,
  token,
}: {
  clip: ClipResource;
  channelId: number;
  token: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    if (deleting) return;
    setDeleting(true);
    setError("");
    try {
      await deleteStudioClip(channelId, clip.clip_key, token);
      setOpen(false);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "クリップを削除できませんでした。");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={`${clip.title}を削除`}
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={(value) => !deleting && setOpen(value)}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md">
          <DialogHeader>
            <DialogTitle>「{clip.title}」を削除しますか？</DialogTitle>
            <DialogDescription className="pt-2 leading-6">
              作成者側、元動画側、公開一覧、共有URLのすべてから完全に削除されます。この操作は元に戻せません。
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="rounded-lg border border-current p-3 text-sm">
              {error}
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
              完全に削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function StudioClipList({
  result,
  token,
  deleteChannelId,
  title,
  previousHref,
  nextHref,
}: {
  result: ClipPage;
  token: string;
  deleteChannelId: number;
  title?: string;
  previousHref?: string;
  nextHref?: string;
}) {
  return (
    <section className="studio-card min-w-0 max-w-full overflow-hidden">
      {title && (
        <div className="border-b border-[var(--studio-border)] p-5">
          <h2 className="font-bold">{title}</h2>
          <p className="mt-1 text-sm text-[var(--studio-muted)]">
            このコンテンツに対して作成されたクリップを管理します。
          </p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-[var(--studio-subtle)] text-xs text-[var(--studio-muted)]">
            <tr>
              <th className="px-4 py-3">クリップ</th>
              <th className="px-4 py-3">作成者</th>
              <th className="px-4 py-3">元の動画</th>
              <th className="px-4 py-3">長さ</th>
              <th className="px-4 py-3">再生数</th>
              <th className="px-4 py-3">作成日時</th>
              <th className="w-24 px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--studio-border)]">
            {result.data.map((clip) => (
              <tr key={clip.clip_key} className="hover:bg-[var(--studio-subtle)]">
                <td className="p-3">
                  <Link
                    href={`/clip/${clip.clip_key}`}
                    target="_blank"
                    className="flex items-center gap-3"
                  >
                    <img
                      src={clip.thumbnail_url}
                      alt=""
                      className="aspect-video w-28 rounded-lg bg-black object-cover"
                    />
                    <span className="max-w-xs truncate font-semibold">{clip.title}</span>
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="block max-w-44 truncate">
                    {clip.creator_channel?.name ?? "チャンネル情報なし"}
                  </span>
                  {clip.creator_channel && (
                    <span className="text-xs text-[var(--studio-muted)]">
                      @{clip.creator_channel.handle}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/video/${clip.source_video.stream_key}`}
                    target="_blank"
                    className="block max-w-56 truncate hover:underline"
                  >
                    {clip.source_video.title}
                  </Link>
                </td>
                <td className="px-4 py-3">{clip.duration_seconds.toFixed(0)}秒</td>
                <td className="px-4 py-3 tabular-nums">
                  {typeof clip.view_count === "number"
                    ? clip.view_count.toLocaleString("ja-JP")
                    : "—"}
                </td>
                <td className="px-4 py-3 text-[var(--studio-muted)]">
                  {new Date(clip.created_at).toLocaleString("ja-JP")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <Button asChild size="icon" variant="ghost">
                      <Link
                        href={`/studio/clips/${encodeURIComponent(clip.clip_key)}`}
                        aria-label={`${clip.title}の再生数分析`}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button asChild size="icon" variant="ghost">
                      <Link
                        href={`/clip/${clip.clip_key}`}
                        target="_blank"
                        aria-label={`${clip.title}を表示`}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>
                    </Button>
                    <DeleteClipButton clip={clip} channelId={deleteChannelId} token={token} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result.data.length === 0 && (
        <p className="p-10 text-center text-sm text-[var(--studio-muted)]">
          該当するクリップはありません
        </p>
      )}
      {result.meta.last_page > 1 && (
        <div className="flex items-center justify-end gap-2 border-t border-[var(--studio-border)] p-4">
          <Button asChild variant="outline" size="sm">
            <Link
              href={previousHref ?? "#"}
              aria-disabled={!previousHref}
              className={!previousHref ? "pointer-events-none opacity-50" : ""}
            >
              前へ
            </Link>
          </Button>
          <span className="text-sm">
            {result.meta.current_page} / {result.meta.last_page}
          </span>
          <Button asChild variant="outline" size="sm">
            <Link
              href={nextHref ?? "#"}
              aria-disabled={!nextHref}
              className={!nextHref ? "pointer-events-none opacity-50" : ""}
            >
              次へ
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}
