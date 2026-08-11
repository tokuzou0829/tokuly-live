import type { ClipPage } from "@/types/clip";
import Link from "next/link";
import ClipCard from "./clip-card";
import React from "react";

export default function VideoClipsSection({
  streamName,
  result,
}: {
  streamName: string;
  result: ClipPage | null;
}) {
  if (result?.data.length === 0) {
    return null;
  }

  return (
    <section className="mt-6 border-t border-slate-200 pt-5" aria-labelledby="video-clips-heading">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="video-clips-heading" className="text-lg font-bold text-slate-950">
          この動画のクリップ
        </h2>
        {(result?.meta.total ?? 0) > 0 && (
          <Link
            href={`/video/${encodeURIComponent(streamName)}/clips`}
            className="shrink-0 text-sm font-semibold text-slate-700 hover:text-slate-950"
          >
            すべて見る
          </Link>
        )}
      </div>
      {result === null ? (
        <p className="rounded-lg bg-white/70 p-4 text-sm text-slate-600">
          クリップを読み込めませんでした。
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 sm:grid-cols-3 lg:grid-cols-4">
          {result.data.slice(0, 6).map((clip) => (
            <ClipCard key={clip.clip_key} clip={clip} compact />
          ))}
        </div>
      )}
    </section>
  );
}
