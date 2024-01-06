"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import Video from "./player";
import DefaultErrorPage from "next/error";
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
      const errorCode: Number = await res.status;
      const newLivedata: Live = await res.json();
      setStatus(newLivedata.status);
    }
  }
  return (
    <div className="w-[100%] md:mr-5 h-[100%]">
      {status == "online" ? (
        <Video id={live.stream_name} />
      ) : (
        <div
          style={{
            width: "100%",
            maxHeight: 600,
            background: "black",
            aspectRatio: "16/9",
            backgroundImage: "url(" + live.thumbnail_url + ")",
            backgroundSize: "cover",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              backgroundColor: "rgba(0,0,0,0.6)",
              left: 0,
              bottom: 0,
              margin: 10,
              padding: 10,
              borderRadius: 10,
            }}
          >
            <p className="text-white">ストリーマーを待っています</p>
          </div>
        </div>
      )}
    </div>
  );
}
