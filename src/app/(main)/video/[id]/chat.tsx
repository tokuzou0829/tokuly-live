"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChatItemView } from "@/components/chat-item";
import { archiveChatItemsAtPlaybackTime, normalizeChatItems } from "@/lib/gifts";
import type { ChatItem } from "@/types/gift";
import { useArchivePlayback } from "./archive-playback-context";

export default function Chat({ id }: { id: number }) {
  const [historyMessages, setHistoryMessages] = useState<ChatItem[]>([]);
  const { currentTime, isEnded } = useArchivePlayback();

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
    () => archiveChatItemsAtPlaybackTime(historyMessages, currentTime, isEnded),
    [currentTime, historyMessages, isEnded]
  );

  return (
    <section className="chat-body mb-2 h-[600px] w-full">
      <div className="chat-label">
        <p>チャット</p>
      </div>
      <div className="chat-message-box">
        {visibleMessages.map((message, index) => (
          <ChatItemView key={`${message.type}-${message.id ?? index}`} item={message} />
        ))}
      </div>
      <div className="chat-footer-message chat-archive-message">
        <p>アーカイブのため参加できません</p>
      </div>
    </section>
  );
}
