"use client";
import React, { useState, useEffect } from "react";
import Video from "./player";
import Live from "./Live";

type Flameprops = {
  live: Live;
};
type Live = {
  id: number;
  title: string;
  status: string;
  stream_name: string;
  thumbnail_url: string;
  static_thumbnail_url: string;
  ch_name: string;
  ch_icon: string;
  ch_handle: string;
};
export default function Videoflame(props: Flameprops) {
  const { live } = props;
  const [status, setStatus] = useState<string>(live.status);
  useEffect(() => {
    const id = setInterval(ChecksStatus, 5000);
    return () => clearInterval(id);
  }, []);
  async function ChecksStatus() {
    if (status !== "online") {
      const res = await fetch("https://api.tokuly.com/live/stream/data", {
        cache: "no-store",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "name=" + live.stream_name,
      });
      const newLivedata: Live = await res.json();

      //console.log(newLivedata.status);
      setStatus(newLivedata.status);
    }
  }
  return (
    <div className="w-[100%] h-[100%]">
      {status == "end" && (
        <Video id={live.stream_name} poster_url={live.static_thumbnail_url} />
      )}
    </div>
  );
}
