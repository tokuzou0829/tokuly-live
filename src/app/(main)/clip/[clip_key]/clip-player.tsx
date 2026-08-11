"use client";

import { ArchivePlaybackProvider } from "@/app/(main)/video/[id]/archive-playback-context";
import Player from "@/app/(main)/video/[id]/player";
import type { ClipResource } from "@/types/clip";
import type { ReactNode } from "react";

export default function ClipPlayer({
  clip,
  children,
}: {
  clip: ClipResource;
  children?: ReactNode;
}) {
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
        />
      </div>
      {children}
    </ArchivePlaybackProvider>
  );
}
