"use client";
import React, { useState, useEffect } from "react";
import Video from "./player";
import type { Live } from "@/types/live";
type Flameprops = {
  live: Live;
};
import { useSearchParams } from "next/navigation";
import { useAtom } from "jotai";
import { IsPartyHost, IsWatchWithFriend, WatchWinFriendRooomId } from "@/atoms/watchWithFriendAtom";

export default function Videoflame(props: Flameprops) {
  const { live } = props;
  const searchParams = useSearchParams();
  const [isHost, setIsHost] = useAtom(IsPartyHost);
  const [isWatchWithFriend, setIsWatchWithFriend] = useAtom(IsWatchWithFriend);
  const [WFrooomId, setWFRooomId] = useAtom(WatchWinFriendRooomId);

  //一緒に観るための処理
  useEffect(() => {
    const roomid = searchParams.get("room_id");
    if (roomid) {
      setIsWatchWithFriend(true);
      setIsHost(false);
      setWFRooomId(roomid);
    } else {
      setIsWatchWithFriend(false);
      setIsHost(false);
      setWFRooomId(null);
    }
  }, []);

  return (
    <div className="w-[100%] min-w-[100%] p-[10px]">
      <div className="overflow-hidden rounded-lg">
        <Video
          id={live.stream_name}
          poster_url={live.static_thumbnail_url}
          isUploadVideo={live.status === "video"}
        />
      </div>
    </div>
  );
}
