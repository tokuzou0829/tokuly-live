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
import { clearWatchHistory, deleteWatchHistoryItem, watchHistoryHref } from "@/requests/playback";
import type { WatchHistoryItem, WatchHistoryPage } from "@/types/playback";
import { Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

function formatSeconds(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function tokyoDateParts(value: string | Date): { year: string; month: string; day: string } | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return { year: part("year"), month: part("month"), day: part("day") };
}

function watchDateGroup(value: string, now = new Date()): { key: string; label: string } {
  const watched = tokyoDateParts(value);
  if (!watched) return { key: "unknown", label: "日時不明" };
  const today = tokyoDateParts(now)!;
  const yesterday = tokyoDateParts(new Date(now.getTime() - 86_400_000))!;
  const key = `${watched.year}-${watched.month}-${watched.day}`;
  const todayKey = `${today.year}-${today.month}-${today.day}`;
  const yesterdayKey = `${yesterday.year}-${yesterday.month}-${yesterday.day}`;
  if (key === todayKey) return { key, label: "今日" };
  if (key === yesterdayKey) return { key, label: "昨日" };
  if (watched.year === today.year) {
    return { key, label: `${Number(watched.month)}月${Number(watched.day)}日` };
  }
  return {
    key,
    label: `${watched.year}年${Number(watched.month)}月${Number(watched.day)}日`,
  };
}

export default function WatchHistoryManager({
  result,
  channelId,
  token,
  title,
}: {
  result: WatchHistoryPage;
  channelId: number;
  token: string;
  title: string;
}) {
  const router = useRouter();
  const [target, setTarget] = useState<WatchHistoryItem | "all" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const groupedItems = result.data.reduce<
    Array<{ key: string; label: string; items: WatchHistoryItem[] }>
  >((groups, item) => {
    const group = watchDateGroup(item.last_watched_at);
    const existing = groups.find((entry) => entry.key === group.key);
    if (existing) existing.items.push(item);
    else groups.push({ ...group, items: [item] });
    return groups;
  }, []);

  async function remove() {
    if (!target || busy) return;
    setBusy(true);
    setError("");
    try {
      if (target === "all") await clearWatchHistory(channelId, token);
      else await deleteWatchHistoryItem(channelId, target.content_type, target.content_key, token);
      setTarget(null);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "視聴履歴を削除できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h1 className="min-w-0 text-2xl font-bold">{title}</h1>
        <Button variant="outline" onClick={() => setTarget("all")} disabled={!result.data.length}>
          <Trash2 className="mr-2 h-4 w-4" /> すべて削除
        </Button>
      </div>
      <div className="space-y-8">
        {groupedItems.map((group) => (
          <section key={group.key}>
            <h2 className="mb-2 text-lg font-bold text-slate-950">{group.label}</h2>
            <ul className="divide-y divide-slate-200">
              {group.items.map((item) => (
                <li
                  key={`${item.content_type}:${item.content_key}`}
                  className="flex min-w-0 items-center gap-2 py-4 sm:gap-4"
                >
                  <Link
                    href={watchHistoryHref(item)}
                    className="group flex min-w-0 flex-1 items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset sm:gap-4"
                  >
                    <div className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-md bg-slate-200 sm:w-40 md:w-48">
                      {item.thumbnail_url && (
                        <img
                          src={item.thumbnail_url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}
                      {item.duration_seconds !== null && item.duration_seconds > 0 && (
                        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[10px] text-white sm:text-xs">
                          {formatSeconds(item.duration_seconds)}
                        </span>
                      )}
                      {!item.completed &&
                        item.resume_position_ms > 0 &&
                        item.duration_seconds !== null &&
                        item.duration_seconds > 0 && (
                          <span className="absolute inset-x-0 bottom-0 h-1 bg-black/30">
                            <span
                              className="block h-full bg-red-600"
                              style={{
                                width: `${Math.min(100, item.resume_position_ms / 10 / item.duration_seconds)}%`,
                              }}
                            />
                          </span>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-2 font-semibold leading-snug text-slate-950 group-hover:underline">
                        {item.title}
                      </h3>
                      {(item.channel_name || typeof item.view_count === "number") && (
                        <p className="mt-1.5 flex min-w-0 items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                          {item.channel_name && (
                            <span className="truncate">{item.channel_name}</span>
                          )}
                          {item.channel_name && typeof item.view_count === "number" && (
                            <span aria-hidden="true" className="h-3 w-px shrink-0 bg-slate-300" />
                          )}
                          {typeof item.view_count === "number" && (
                            <span className="shrink-0 tabular-nums">
                              {item.view_count.toLocaleString("ja-JP")} 回再生
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </Link>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    aria-label={`${item.title}を履歴から削除`}
                    onClick={() => setTarget(item)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
      {!result.data.length && (
        <p className="border-y border-slate-200 py-12 text-center text-sm text-muted-foreground">
          視聴履歴はありません。
        </p>
      )}
      {result.meta.last_page > 1 && (
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button asChild variant="outline" disabled={result.meta.current_page <= 1}>
            <Link href={`/watch-history?page=${Math.max(1, result.meta.current_page - 1)}`}>
              前へ
            </Link>
          </Button>
          <span className="text-sm">
            {result.meta.current_page} / {result.meta.last_page}
          </span>
          <Button
            asChild
            variant="outline"
            disabled={result.meta.current_page >= result.meta.last_page}
          >
            <Link
              href={`/watch-history?page=${Math.min(result.meta.last_page, result.meta.current_page + 1)}`}
            >
              次へ
            </Link>
          </Button>
        </div>
      )}
      <Dialog open={target !== null} onOpenChange={(open) => !open && !busy && setTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {target === "all" ? "視聴履歴をすべて削除しますか？" : "この履歴を削除しますか？"}
            </DialogTitle>
            <DialogDescription>
              この操作は元に戻せません。
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={busy}>
                キャンセル
              </Button>
            </DialogClose>
            <Button onClick={() => void remove()} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
