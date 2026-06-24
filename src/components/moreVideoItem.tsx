"use client";

import Link from "next/link";
import type { MoreVideoList } from "@/types/live";

export function MoreVideoItem({ video }: { video: MoreVideoList }) {
  const href = `/${video.type === "live" ? "live" : "video"}/${video.stream_name}`;
  const badge = getBadge(video.type);
  const displayThumbnail = isDisplayableImageUrl(video.thumbnail_url);
  const displayChannelIcon = isDisplayableImageUrl(video.ch_icon);

  return (
    <Link
      href={href}
      className="group flex min-w-0 gap-2.5 rounded-lg px-1 py-1.5 hover:bg-muted/45 focus-visible:outline-none focus-visible:bg-muted/45"
    >
      <div className="relative aspect-video w-[136px] shrink-0 overflow-hidden rounded-lg bg-muted sm:w-[150px] xl:w-[142px]">
        {displayThumbnail && (
          <img
            src={video.thumbnail_url}
            alt=""
            className="relative h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        )}
        {badge && (
          <span className="absolute left-1.5 top-1.5 inline-flex h-5 items-center rounded-md bg-neutral-900/55 px-2 text-[10px] font-semibold leading-none text-white">
            {badge}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-foreground">
          {video.title}
        </p>
        <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
          <div className="relative h-5 w-5 shrink-0 overflow-hidden rounded-full bg-muted">
            {displayChannelIcon && (
              <img
                src={video.ch_icon}
                alt={video.ch_name ? `${video.ch_name}のアイコン` : "投稿者のアイコン"}
                className="relative h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            )}
          </div>
          <p className="min-w-0 truncate text-[12px] leading-tight text-muted-foreground">
            {video.ch_name}
          </p>
        </div>
      </div>
    </Link>
  );
}

function getBadge(type: string) {
  if (type === "live") {
    return "ライブ";
  }

  if (type === "archive") {
    return "アーカイブ";
  }

  return null;
}

function isDisplayableImageUrl(url: string) {
  if (!url) {
    return false;
  }

  const normalizedUrl = url.toLowerCase();

  return !["no-image", "no_image", "noimage", "no%20image", "placeholder"].some((keyword) =>
    normalizedUrl.includes(keyword)
  );
}
