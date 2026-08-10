"use client";

import LivePlayer from "@/app/(main)/live/[id]/player";
import { ArchivePlaybackProvider } from "@/app/(main)/video/[id]/archive-playback-context";
import VideoPlayer from "@/app/(main)/video/[id]/player";
import type { Live } from "@/types/live";
import React, { useEffect, useState } from "react";

function TokulyPlayerPreviewContent({ streamKey }: { streamKey: string }) {
  const [live, setLive] = useState<Live>();
  const [archiveAvailable, setArchiveAvailable] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function refresh() {
      const response = await fetch("https://api.tokuly.com/live/stream/data", {
        cache: "no-store",
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ name: streamKey }),
        signal: controller.signal,
      });
      if (!response.ok) return;
      const next = (await response.json()) as Live;
      setLive(next);

      if (next.status === "end" || next.status === "video") {
        const archive = await fetch(
          `https://live-data.tokuly.com/videos/hls/${streamKey}/index.m3u8`,
          { signal: controller.signal }
        );
        setArchiveAvailable(archive.ok);
      } else {
        setArchiveAvailable(false);
      }
    }

    void refresh().catch((error) => {
      if (!(error instanceof DOMException && error.name === "AbortError")) setLive(undefined);
    });
    const timer = window.setInterval(() => void refresh().catch(() => undefined), 5_000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [streamKey]);

  if (!live) return <div className="aspect-video h-full w-full bg-black" />;
  if (live.status === "online") return <LivePlayer id={streamKey} />;
  if (archiveAvailable) {
    return (
      <VideoPlayer
        id={streamKey}
        poster_url={live.static_thumbnail_url}
        isUploadVideo={live.status === "video"}
        subtitles={live.subtitles ?? []}
      />
    );
  }

  return (
    <div
      className="relative aspect-video h-full w-full bg-black bg-cover bg-center"
      style={{ backgroundImage: `url(${live.thumbnail_url})` }}
    >
      <p className="absolute bottom-3 left-3 rounded-lg bg-black/70 px-3 py-2 text-sm text-white">
        {live.status === "offline" ? "ストリーマーを待っています" : "配信を開始しています"}
      </p>
    </div>
  );
}

export default function TokulyPlayerPreview({ streamKey }: { streamKey: string }) {
  return (
    <ArchivePlaybackProvider>
      <TokulyPlayerPreviewContent streamKey={streamKey} />
    </ArchivePlaybackProvider>
  );
}
