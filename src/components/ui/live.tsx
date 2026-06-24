"use client";
import { useState } from "react";
import { ContentCard } from "@/components/ui/content-card";
import type { LiveList } from "@/types/live";

export default function Live({ live, className }: { live: LiveList; className?: string }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isHoverImageLoaded, setIsHoverImageLoaded] = useState(false);
  const [hoverImageUrl, setHoverImageUrl] = useState("");

  const handleMouseEnter = () => {
    if (!isHoverImageLoaded && !hoverImageUrl) {
      const previewUrl = "https://live-data.tokuly.com/thumbnail-preview?id=" + live.stream_name;
      setHoverImageUrl(previewUrl);
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleHoverImageLoad = () => {
    setIsHoverImageLoaded(true);
  };

  return (
    <ContentCard
      href={"/live/" + live.stream_name}
      title={live.title}
      thumbnailUrl={isHovered && isHoverImageLoaded ? hoverImageUrl : live.thumbnail_url}
      channelName={live.ch_name}
      channelIcon={live.ch_icon}
      variant="live"
      className={className}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {hoverImageUrl && (
        <img
          src={hoverImageUrl}
          alt=""
          aria-hidden="true"
          className="hidden"
          onLoad={handleHoverImageLoad}
        />
      )}
    </ContentCard>
  );
}
