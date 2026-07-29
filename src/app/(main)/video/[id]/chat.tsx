"use client";

import { useEffect, useMemo, useState } from "react";
import io from "socket.io-client";
import { type Session } from "next-auth";
import { ChatItemView } from "@/components/chat-item";
import { mergeChatItems, normalizeChatItem, normalizeChatItems } from "@/lib/gifts";
import type { ChatItem } from "@/types/gift";

export default function Chat({ id, session }: { id: number; session: Session | null }) {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [historyMessages, setHistoryMessages] = useState<ChatItem[]>([]);
  const accessToken = session?.user?.access_token;

  useEffect(() => {
    const controller = new AbortController();
    const data = new URLSearchParams({ stream_id: id.toString() });
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

  useEffect(() => {
    const socket = io("https://live-data.tokuly.com", { path: "/chat/socket.io/" });
    async function connectChat() {
      if (session?.user && accessToken) {
        const request = await fetch("https://live-data.tokuly.com/chat-auth/", {
          method: "POST",
          body: JSON.stringify({ token: accessToken }),
          headers: { "Content-Type": "application/json" },
        });
        const chatKey = await request.json();
        socket.emit("join", { roomId: id, name: session.user.name, token: chatKey.authKey });
        setIsConnected(true);
      } else {
        socket.on("connect", () => {
          socket.emit("join", { roomId: id, name: "guest", token: "guest" });
          setIsConnected(true);
        });
      }
      socket.on("message", (rawMessage: unknown) => {
        const item = normalizeChatItem(rawMessage);
        if (item) setMessages((previous) => mergeChatItems([item], previous));
      });
    }
    connectChat().catch(() => setIsConnected(false));
    return () => {
      socket.disconnect();
    };
  }, [accessToken, id, session?.user]);

  const visibleMessages = useMemo(
    () => mergeChatItems(messages, historyMessages),
    [messages, historyMessages]
  );

  return (
    <div className="mb-2 h-[600px] w-full rounded-lg border bg-white">
      <div className="h-10 border-b text-center">
        <p className="pt-2">チャット</p>
      </div>
      <div className="flex h-[80%] flex-col-reverse overflow-y-auto">
        {visibleMessages.map((message, index) => (
          <ChatItemView
            key={
              message.type === "gift"
                ? `gift-${message.id}`
                : `chat-${message.id ?? index}-${index}`
            }
            item={message}
          />
        ))}
        {isConnected && <p className="m-2 text-gray-600">チャットに接続しました</p>}
      </div>
      <div className="h-[60px] border-t">
        <p className="m-auto w-fit pt-6">アーカイブのため参加できません</p>
      </div>
    </div>
  );
}
