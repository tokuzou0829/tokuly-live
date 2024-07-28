"use client";
import Link from "next/link";
import { useState } from "react";
import type { Live, LiveList } from "@/types/live";

export default function Live({live}:{live:LiveList}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isHoverImageLoaded, setIsHoverImageLoaded] = useState(false);
  const [hoverImageUrl, setHoverImageUrl] = useState('');

  const handleMouseEnter = () => {
    if (!isHoverImageLoaded && !hoverImageUrl) {
      const previewUrl = 'https://live-data.tokuly.com/thumbnail-preview?id=' + live.stream_name;
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
    <Link
      href={"/live/" + live.stream_name}
      className="m-3 block w-[250px] shrink-0"
    >
      <div
        className="relative"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <img
          src={isHovered && isHoverImageLoaded ? hoverImageUrl : live.thumbnail_url}
          className="w-[250px] rounded-lg aspect-video object-cover"
        />
        <div className="absolute bg-red-600 w-[100px] h-[25px] top-[5px] left-[5px] rounded-md">
          <p className="text-white text-center font-semibold">ライブ配信</p>
        </div>
        {hoverImageUrl && (
          <img
            src={hoverImageUrl}
            className="hidden"
            onLoad={handleHoverImageLoad}
          />
        )}
      </div>
      <div className="flex m-1 overflow-hidden">
        <img
          src={live.ch_icon}
          className="w-[40px] h-[40px] rounded-full aspect-square mr-1 object-cover"
        />
        <div>
          <p className="font-bold mb-0 truncate w-[210px]">{live.title}</p>
          <p className="mt-0 text-sm">{live.ch_name}</p>
        </div>
      </div>
    </Link>
  );
}
