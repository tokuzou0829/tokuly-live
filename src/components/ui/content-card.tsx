"use client";

import Link from "next/link";
import type { MouseEventHandler, ReactNode } from "react";
import { cn } from "@/lib/utils";

type ContentCardProps = {
  href: string;
  title: string;
  thumbnailUrl: string;
  channelName: string;
  channelIcon: string;
  variant?: "live" | "archive";
  className?: string;
  children?: ReactNode;
  onMouseEnter?: MouseEventHandler<HTMLAnchorElement>;
  onMouseLeave?: MouseEventHandler<HTMLAnchorElement>;
};

export function ContentCard({
  href,
  title,
  thumbnailUrl,
  channelName,
  channelIcon,
  variant,
  className,
  children,
  onMouseEnter,
  onMouseLeave,
}: ContentCardProps) {
  const isLive = variant === "live";
  const displayThumbnail = isDisplayableImageUrl(thumbnailUrl);
  const displayChannelIcon = isDisplayableImageUrl(channelIcon);

  return (
    <Link
      href={href}
      className={cn(
        "block w-[230px] shrink-0 mr-3 focus-visible:outline-none",
        className
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      >
        <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
        {displayThumbnail && (
          <img
            key={thumbnailUrl}
            src={thumbnailUrl}
            alt=""
            className="relative h-full w-full object-cover"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        )}
        {variant && (
          <div className="absolute left-1.5 top-1.5">
            <span
              className={cn(
                "inline-flex h-5 items-center gap-1 rounded-md px-2 text-[10px] font-semibold leading-none text-white",
                isLive ? "bg-red-600/75" : "bg-neutral-900/55"
              )}
            >
              {isLive && <span className="h-1 w-1 rounded-full bg-white/90" />}
              {isLive ? "ライブ配信" : "アーカイブ"}
            </span>
          </div>
        )}
      </div>
      <div className="mt-2 min-w-0">
        <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-foreground">
          {title}
        </p>
        <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
          <div className="relative h-6 w-6 shrink-0 overflow-hidden rounded-full bg-muted">
            {displayChannelIcon && (
              <img
                key={channelIcon}
                src={channelIcon}
                alt={channelName ? `${channelName}のアイコン` : "投稿者のアイコン"}
                className="relative h-full w-full object-cover"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            )}
          </div>
          <p className="min-w-0 truncate text-[12px] leading-tight text-muted-foreground">
            {channelName}
          </p>
        </div>
      </div>
      {children}
    </Link>
  );
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
