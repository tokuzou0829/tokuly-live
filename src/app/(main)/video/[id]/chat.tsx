"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChatItemView } from "@/components/chat-item";
import { archiveChatItemsAtPlaybackTime, normalizeChatItems } from "@/lib/gifts";
import type { ChatItem } from "@/types/gift";
import { useArchivePlayback } from "./archive-playback-context";

export default function Chat({ id }: { id: number }) {
  const [historyMessages, setHistoryMessages] = useState<ChatItem[]>([]);
  const { currentTime } = useArchivePlayback();

  useEffect(() => {
    const controller = new AbortController();
    const data = new URLSearchParams({ stream_id: id.toString(), archive: "true" });
    fetch("https://api.tokuly.com/live/stream/chat/get", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: data.toString(),
      signal: controller.signal,
    })
      .then((response) => response.json())
      .then((responseData) => setHistoryMessages(normalizeChatItems(responseData)))
      .catch(() => undefined);
    return () => controller.abort();
  }, [id]);

  const visibleMessages = useMemo(
    () => archiveChatItemsAtPlaybackTime(historyMessages, currentTime),
    [currentTime, historyMessages]
  );

  return (
    <div className="mb-2 h-[600px] w-full rounded-lg border bg-white">
      <div className="h-10 border-b text-center">
        <p className="pt-2">チャット</p>
      </div>
      <div className="flex h-[80%] flex-col-reverse overflow-y-auto">
        {visibleMessages.map((message, index) => (
          <ChatItemView key={`${message.type}-${message.id ?? index}`} item={message} />
        ))}
      </div>
      <div className="h-[60px] border-t">
        <p className="m-auto w-fit pt-6">アーカイブのため参加できません</p>
      </div>
    </div>
  );
}
