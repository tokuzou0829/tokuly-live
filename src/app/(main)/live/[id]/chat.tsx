"use client";

import React, { useEffect, useMemo, useState } from "react";
import io, { Socket } from "socket.io-client";
import { type Session } from "next-auth";
import { Send } from "lucide-react";
import { ChatItemView } from "@/components/chat-item";
import { GiftPopover } from "@/components/gift-popover";
import { mergeChatItems, normalizeChatItem, normalizeChatItems } from "@/lib/gifts";
import type { ChatItem } from "@/types/gift";
import { notifyTokulyUnauthorized } from "@/lib/auth-session-events";

interface ChatProps {
  id: number;
  channelId?: number;
  giftsEnabled?: boolean;
  session: Session | null;
}

export default function Chat({ id, channelId, giftsEnabled = false, session }: ChatProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [msg, setMsg] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [historyMessages, setHistoryMessages] = useState<ChatItem[]>([]);
  const accessToken = session?.user?.access_token;
  const postingIdentity = session?.activePostingIdentity;
  const postingChannelId =
    postingIdentity?.type === "channel" ? postingIdentity.channelId : undefined;
  const postingName = postingIdentity?.name ?? session?.user?.name;

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
      .catch((error) => {
        if (error instanceof Error && error.name !== "AbortError") {
          console.error("API Request Error:", error);
        }
      });
    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    const chatSocket = io("https://live-data.tokuly.com", { path: "/chat/socket.io/" });
    setSocket(chatSocket);

    async function connectChat() {
      if (session?.user && accessToken) {
        const request = await fetch("https://live-data.tokuly.com/chat-auth/", {
          method: "POST",
          body: JSON.stringify({
            token: accessToken,
            ...(postingChannelId === undefined ? {} : { channel_id: postingChannelId }),
          }),
          headers: { "Content-Type": "application/json" },
        });
        if (request.status === 401) {
          notifyTokulyUnauthorized();
          return;
        }
        if (!request.ok) throw new Error("チャット認証に失敗しました");
        const chatKey = await request.json();
        chatSocket.emit("join", {
          roomId: id,
          name: postingName,
          token: chatKey.authKey,
        });
        setIsConnected(true);
      } else {
        chatSocket.on("connect", () => {
          chatSocket.emit("join", { roomId: id, name: "guest", token: "guest" });
          setIsConnected(true);
        });
      }

      chatSocket.on("message", (rawMessage: unknown) => {
        const item = normalizeChatItem(rawMessage);
        if (item) setMessages((previous) => mergeChatItems([item], previous));
      });
    }

    connectChat().catch(() => setIsConnected(false));
    return () => {
      chatSocket.disconnect();
    };
  }, [accessToken, id, postingChannelId, postingName, session?.user]);

  const visibleMessages = useMemo(
    () => mergeChatItems(messages, historyMessages),
    [messages, historyMessages]
  );

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!socket || !session?.user || !msg.trim()) return;
    socket.emit("post", { text: msg.trim() });
    setMsg("");
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] min-h-[360px] max-h-[600px] w-full flex-col overflow-hidden rounded-lg border bg-white">
      <div className="h-10 shrink-0 border-b">
        <p className="pt-2 text-center">チャット</p>
      </div>
      <div className="m-2 flex min-h-0 flex-1 flex-col-reverse overflow-y-auto bg-white">
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
      {session?.user ? (
        <form onSubmit={handleSubmit} className="shrink-0 border-t p-2">
          <div className="flex items-center gap-2">
            <input
              type="text"
              id="msg"
              aria-label="チャットメッセージ"
              autoComplete="off"
              value={msg}
              onChange={(event) => setMsg(event.target.value)}
              className="max-h-[40px] flex-1 rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {giftsEnabled &&
              accessToken &&
              channelId !== undefined &&
              Number.isFinite(channelId) && (
                <GiftPopover
                  channelId={channelId}
                  liveStreamId={id}
                  token={accessToken}
                  senderChannelId={postingChannelId}
                />
              )}
            <button
              type="submit"
              aria-label="チャットを送信"
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-gray-100"
            >
              <Send size={24} />
            </button>
          </div>
        </form>
      ) : (
        <div className="h-10 shrink-0 border-t">
          <p className="pt-3 text-center">ログインしてチャットに参加</p>
        </div>
      )}
    </div>
  );
}
