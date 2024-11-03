"use client";

import React, { useState, useEffect } from "react";
import Player from "@/app/(main)/live/[id]/player";
import VideoPlayer from "@/app/(main)/video/[id]/player";
import type { Live } from "@/types/live";
import { is } from "date-fns/locale";

export default function LivePage({ params }: { params: { id: string } }) {
  const [live, setLive] = useState<Live>();
  const [status, setStatus] = useState<string>("");
  const [isArchive, setIsArchive] = useState<boolean>(false);
  useEffect(() => {
    async function ChecksStatus() {
      if (status !== "online") {
        const res = await fetch("https://api.tokuly.com/live/stream/data", {
          cache: "no-store",
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: "name=" + params.id,
        });
        const errorCode: Number = await res.status;
        const newLivedata: Live = await res.json();
        setStatus(newLivedata.status);
        if(newLivedata.status === "end" && !isArchive){
          const checkvideo = await fetch(`https://live-data.tokuly.com/videos/hls/${params.id}/index.m3u8`, {
            method:"GET",
            headers: {},
          });
          if(checkvideo.ok){
            setIsArchive(true);
          }
        }
      }
    }
    async function getStatus() {
      const res = await fetch("https://api.tokuly.com/live/stream/data", {
        cache: "no-store",
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "name=" + params.id,
      });
      const newLivedata: Live = await res.json();
      setStatus(newLivedata.status);
      setLive(newLivedata);
      if((newLivedata.status === "end" || newLivedata.status === "video") && !isArchive){
        const checkvideo = await fetch(`https://live-data.tokuly.com/videos/hls/${params.id}/index.m3u8`, {
          method:"GET",
          headers: {},
        });
        if(checkvideo.ok){
          setIsArchive(true);
        }
      }
    }
    getStatus();
    const id = setInterval(ChecksStatus, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <>
      {live && (
        <div className="w-[100%] h-[100%]">
          {status == "online" ? (
            <Player id={params.id} />
          ) : (
            <>
              {isArchive ? (
                <VideoPlayer id={params.id} poster_url={live.static_thumbnail_url} isUploadVideo={live.status === "video"} />
              ):(
                <div
                  style={{
                    width: "100%",
                    height: "100%",
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
                    {status == "offline" ? (
                      <p className="text-white">ストリーマーを待っています</p>
                    ) : (
                      <p className="text-white">配信を開始しています</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
