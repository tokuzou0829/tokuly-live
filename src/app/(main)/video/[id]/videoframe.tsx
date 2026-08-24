"use client";
import React, { useEffect } from "react";
import Video from "./player";
import type { Live } from "@/types/live";
type Flameprops = {
  live: Live;
};
import { useSearchParams } from "next/navigation";
import { useAtom } from "jotai";
import { IsPartyHost, IsWatchWithFriend, WatchWithFriendRoomId } from "@/atoms/watchWithFriendAtom";

export default function Videoflame(props: Flameprops) {
  const { live } = props;
  const searchParams = useSearchParams();
  const [isHost, setIsHost] = useAtom(IsPartyHost);
  const [isWatchWithFriend, setIsWatchWithFriend] = useAtom(IsWatchWithFriend);
  const [, setWFRooomId] = useAtom(WatchWithFriendRoomId);

  //一緒に観るための処理
  useEffect(() => {
    const roomid = searchParams?.get("room_id");
    if (roomid) {
      setIsWatchWithFriend(true);
      setIsHost(false);
      setWFRooomId(roomid);
    } else {
      setIsWatchWithFriend(false);
      setIsHost(false);
      setWFRooomId(null);
    }
  }, [searchParams, setIsHost, setIsWatchWithFriend, setWFRooomId]);

  return (
    <div className="w-[100%] min-w-[100%]">
      <div className="overflow-hidden rounded-lg">
        <Video
          id={live.stream_name}
          poster_url={live.static_thumbnail_url}
          isUploadVideo={live.status === "video"}
          subtitles={live.subtitles ?? []}
          playbackContent={{
            type: live.status === "video" ? "video" : "archive",
            key: live.stream_name,
          }}
        />
      </div>
    </div>
  );
}
