import type { ClipResource } from "@/types/clip";
import Link from "next/link";
import { Scissors } from "lucide-react";
import React from "react";

export function formatClipDuration(seconds: number): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const minutes = Math.floor(safe / 60);
  const remainder = Math.floor(safe % 60);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export default function ClipCard({
  clip,
  compact = false,
}: {
  clip: ClipResource;
  compact?: boolean;
}) {
  const creator = clip.creator_channel;

  return (
    <article className="group min-w-0">
      <Link href={`/clip/${encodeURIComponent(clip.clip_key)}`} className="block">
        <div className="relative aspect-video overflow-hidden rounded-xl bg-slate-200">
          <img src={clip.thumbnail_url} alt="" className="h-full w-full object-cover" />
          <span
            className={`absolute rounded bg-black/85 font-mono text-white ${
              compact
                ? "bottom-1 right-1 px-1 py-0.5 text-[10px]"
                : "bottom-2 right-2 px-1.5 py-0.5 text-xs"
            }`}
          >
            {formatClipDuration(clip.duration_seconds)}
          </span>
        </div>
        <h3
          className={`line-clamp-2 font-semibold leading-snug text-slate-950 ${
            compact ? "mt-1.5 text-sm" : "mt-2"
          }`}
        >
          {clip.title}
        </h3>
      </Link>
      <div
        className={`flex min-w-0 items-center ${compact ? "mt-0.5 gap-1 text-[11px]" : "mt-1 gap-1.5 text-xs"}`}
      >
        {creator ? (
          <Link
            href={`/${creator.handle}`}
            className={`flex min-w-0 flex-1 items-center text-slate-600 hover:text-slate-950 ${compact ? "gap-1" : "gap-1.5"}`}
          >
            {creator.icon_url ? (
              <img
                src={creator.icon_url}
                alt=""
                className={`${compact ? "h-4 w-4" : "h-5 w-5"} shrink-0 rounded-full object-cover`}
              />
            ) : (
              <span
                className={`flex shrink-0 items-center justify-center rounded-full bg-slate-200 ${
                  compact ? "h-4 w-4" : "h-5 w-5"
                }`}
              >
                <Scissors className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
              </span>
            )}
            <span className="truncate">{creator.name}</span>
          </Link>
        ) : (
          <div
            className={`flex min-w-0 flex-1 items-center text-slate-500 ${compact ? "gap-1" : "gap-1.5"}`}
          >
            <span
              className={`flex shrink-0 items-center justify-center rounded-full bg-slate-200 ${
                compact ? "h-4 w-4" : "h-5 w-5"
              }`}
            >
              <Scissors className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
            </span>
            <span className="truncate">チャンネル情報なし</span>
          </div>
        )}
        {typeof clip.view_count === "number" && (
          <p className="ml-auto shrink-0 whitespace-nowrap tabular-nums text-slate-500">
            {clip.view_count.toLocaleString("ja-JP")} 回再生
          </p>
        )}
      </div>
    </article>
  );
}
