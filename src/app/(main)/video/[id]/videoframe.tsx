"use client";
import React, { useState, useEffect } from "react";
import Video from "./player";
import type { Live } from "@/types/live";
type Flameprops = {
  live: Live;
};

export default function Videoflame(props: Flameprops) {
  const { live } = props;
  return (
    <div className="w-[100%] h-[100%]">
      <Video id={live.stream_name} poster_url={live.static_thumbnail_url} isUploadVideo={live.status === "video"} />
    </div>
  );
}
