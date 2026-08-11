"use client";

import React from "react";
import { useCallback, useEffect, useState } from "react";
import formatDistanceToNowStrict from "date-fns/formatDistanceToNowStrict";
import { ja } from "date-fns/locale";
import { utcToZonedTime } from "date-fns-tz";
import type { Live } from "@/types/live";
import { useAtom } from "jotai";
import {
  IsPartyHost,
  IsWatchWithFriend,
  WatchPartyConnectionStatus,
  WatchWithFriendRoomId,
} from "@/atoms/watchWithFriendAtom";
import { LogOut, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy } from "lucide-react";
import type { ClipPage } from "@/types/clip";
import VideoClipsSection from "@/components/video-clips-section";

export default function LiveOverview({
  live,
  clips = null,
}: {
  live: Live;
  clips?: ClipPage | null;
}) {
  const [isWWF, setIsWWF] = useAtom<boolean>(IsWatchWithFriend);
  const [WWFRoomId, setWWFRoomId] = useAtom<string | null>(WatchWithFriendRoomId);
  const [, setIsHost] = useAtom<boolean>(IsPartyHost);
  const [partyConnectionStatus, setPartyConnectionStatus] = useAtom(WatchPartyConnectionStatus);
  const [partyUrl, setPartyUrl] = useState("");

  //console.log(live);
  function copyLink() {
    if (partyUrl) return navigator.clipboard.writeText(partyUrl);
  }
  const [status, setStatus] = useState<string>("offline");
  const [streamOverview, setStreamOverview] = useState<string>(live.stream_overview);
  const [StreamStartTime, setStreamStartTime] = useState<string>(live.stream_start_time);
  function linkify(text: string) {
    const urlRegex = /(\bhttps?:\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/gi;

    return text.split("\n").map((line, index, array) => (
      <span key={index}>
        {line.split(urlRegex).map((part, i) =>
          urlRegex.test(part) ? (
            <a
              href={part}
              key={i}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500"
            >
              {part}
            </a>
          ) : (
            part
          )
        )}
        {index !== array.length - 1 && <br />}
      </span>
    ));
  }

  function formatDate(StreamStartTimeData: string): string {
    if (StreamStartTimeData) {
      const timeZone = "Asia/Tokyo";
      const zonedDate = utcToZonedTime(StreamStartTimeData, timeZone);
      return formatDistanceToNowStrict(zonedDate, { locale: ja }) + "前に配信";
    } else {
      return "ストリーマーを待機中";
    }
  }

  useEffect(() => {
    if (!WWFRoomId) {
      setPartyUrl("");
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("room_id", WWFRoomId);
    setPartyUrl(url.toString());
  }, [WWFRoomId]);

  const checksStatus = useCallback(async () => {
    if (status !== "online") {
      const res = await fetch("https://api.tokuly.com/live/stream/data", {
        next: { revalidate: 10 },
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "name=" + live.stream_name,
      });
      const newLivedata: Live = await res.json();
      setStatus(newLivedata.status);
      setStreamOverview(newLivedata.stream_overview);
      setStreamStartTime(newLivedata.stream_start_time);
    }
  }, [live.stream_name, status]);

  useEffect(() => {
    const intervalId = setInterval(checksStatus, 10000);
    return () => clearInterval(intervalId);
  }, [checksStatus]);
  return (
    <div className="p-[10px] bg-slate-100 mt-3 rounded-lg">
      <p className="font-bold text-slate-900	">{formatDate(StreamStartTime)}</p>
      <p className="mb-0">{linkify(streamOverview)}</p>
      <div className="mt-5">
        <Dialog>
          <DialogTrigger asChild>
            {live.status == "video" && !isWWF && (
              <button
                className="flex items-center text-gray-600 p-1 rounded-lg hover:bg-gray-200"
                onClick={() => {
                  const room_id = crypto.randomUUID();
                  setWWFRoomId(room_id);
                  setIsWWF(true);
                  setIsHost(false);
                  setPartyConnectionStatus("connecting");
                  const url = new URL(window.location.href);
                  url.searchParams.set("room_id", room_id);
                  window.history.pushState({}, "", url.toString());
                }}
              >
                <PartyPopper size={15} />
                <span className="ml-1">この動画をみんなで観る</span>
              </button>
            )}
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>一緒に観る</DialogTitle>
              <DialogDescription>
                友達にこのリンクを共有して一緒にこの動画を楽しみましょう！
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center space-x-2">
              <div className="grid flex-1 gap-2">
                <Label htmlFor="link" className="sr-only">
                  Link
                </Label>
                <Input id="link" value={partyUrl} readOnly />
              </div>
              <Button
                type="button"
                size="sm"
                className="px-3"
                onClick={copyLink}
                disabled={partyConnectionStatus !== "connected"}
              >
                <span className="sr-only">Copy</span>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" disabled={partyConnectionStatus !== "connected"}>
                  {partyConnectionStatus === "connected" ? "始める" : "接続中…"}
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        {isWWF && (
          <button
            className="flex items-center text-gray-600 p-1 rounded-lg hover:bg-gray-200"
            onClick={() => {
              setIsWWF(false);
              setIsHost(false);
              setWWFRoomId(null);
              setPartyConnectionStatus("idle");
              const url = new URL(window.location.href);
              url.searchParams.delete("room_id");
              window.history.pushState({}, "", url.toString());
            }}
          >
            <LogOut size={15} />
            <span className="ml-1">パーティーから退出する</span>
          </button>
        )}
      </div>
      <VideoClipsSection streamName={live.stream_name} result={clips} />
    </div>
  );
}
