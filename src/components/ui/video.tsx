"use client";
import { ContentCard } from "@/components/ui/content-card";
import type { LiveList } from "@/types/live";

export default function Video({ live, className }: { live: LiveList; className?: string }) {
  return (
    <ContentCard
      href={"/video/" + live.stream_name}
      title={live.title}
      thumbnailUrl={live.thumbnail_url}
      channelName={live.ch_name}
      channelIcon={live.ch_icon}
      durationSeconds={live.duration_seconds}
      viewCount={live.view_count}
      variant={live.type === "archive" ? "archive" : undefined}
      className={className}
    />
  );
}
