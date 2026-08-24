"use client";

import { ArchivePlaybackProvider } from "@/app/(main)/video/[id]/archive-playback-context";
import Player from "@/app/(main)/video/[id]/player";
import type { ClipResource } from "@/types/clip";
import React, { type ReactNode } from "react";

export default function ClipPlayer({
  clip,
  children,
}: {
  clip: ClipResource;
  children?: ReactNode;
}) {
  const viewCount = typeof clip.view_count === "number" ? clip.view_count + 1 : undefined;
  return (
    <ArchivePlaybackProvider>
      <div className="overflow-hidden rounded-xl bg-black">
        <Player
          id={clip.source_video.stream_key}
          poster_url={clip.thumbnail_url}
          isUploadVideo={clip.source_video.type === "video"}
          playbackRange={{
            startSeconds: clip.start_seconds,
            endSeconds: clip.end_seconds,
          }}
          shareUrl={`https://live.tokuly.com/clip/${encodeURIComponent(clip.clip_key)}`}
          playbackContent={{ type: "clip", key: clip.clip_key }}
        />
      </div>
      {typeof viewCount === "number" && (
        <p className="mt-2 text-sm font-medium text-slate-600" aria-live="polite">
          {viewCount.toLocaleString("ja-JP")} 回再生
        </p>
      )}
      {children}
    </ArchivePlaybackProvider>
  );
}
