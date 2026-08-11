"use client";

import { useArchivePlayback } from "@/app/(main)/video/[id]/archive-playback-context";
import type { ClipResource } from "@/types/clip";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function buildSourceVideoHref(
  streamKey: string,
  startSeconds: number,
  clipCurrentTime: number
): string {
  const sourceTime = Math.round((startSeconds + Math.max(0, clipCurrentTime)) * 10) / 10;
  return `/video/${encodeURIComponent(streamKey)}?t=${sourceTime.toFixed(1)}`;
}

export default function ClipSourceLink({
  clip,
  children,
  className,
}: {
  clip: ClipResource;
  children: ReactNode;
  className?: string;
}) {
  const { currentTime } = useArchivePlayback();
  const router = useRouter();
  const initialHref = buildSourceVideoHref(
    clip.source_video.stream_key,
    clip.start_seconds,
    0
  );

  return (
    <Link
      href={initialHref}
      className={className}
      onClick={(event) => {
        const href = buildSourceVideoHref(
          clip.source_video.stream_key,
          clip.start_seconds,
          currentTime
        );

        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          event.currentTarget.href = href;
          return;
        }

        event.preventDefault();
        router.push(href);
      }}
    >
      {children}
    </Link>
  );
}
