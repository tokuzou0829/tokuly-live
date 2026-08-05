"use client";

import { useEffect, useMemo, useState } from "react";
import io, { Socket } from "socket.io-client";
import { type Session } from "next-auth";
import { ChatItemView } from "@/components/chat-item";
import { mergeChatItems, normalizeChatItem, normalizeChatItems } from "@/lib/gifts";
import type { ChatItem } from "@/types/gift";
import { notifyTokulyUnauthorized } from "@/lib/auth-session-events";

export default function Chat({ id, session }: { id: number; session: Session | null }) {
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
      .catch(() => undefined);
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
        chatSocket.emit("join", { roomId: id, name: postingName, token: chatKey.authKey });
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
    <div className="h-full w-full bg-white chat-body">
      <div className="flex h-[5%] items-center justify-center border-b text-center chat-label">
        <p>チャット</p>
      </div>
      <div className="flex h-[85%] flex-col-reverse overflow-y-auto chat-message-box">
        {visibleMessages.map((message, index) => (
          <ChatItemView
            key={
              message.type === "gift"
                ? `gift-${message.id}`
                : `chat-${message.id ?? index}-${index}`
            }
            item={message}
            compact
          />
        ))}
        {isConnected && <p className="m-2 text-gray-600 chat-status">チャットに接続しました</p>}
      </div>
      {session?.user ? (
        <form onSubmit={handleSubmit} className="h-[10%] chat-input">
          <div className="flex items-center justify-center">
            <input
              type="text"
              aria-label="チャットメッセージ"
              autoComplete="off"
              value={msg}
              onChange={(event) => setMsg(event.target.value)}
              className="m-2 h-8 w-full rounded-md border-2"
            />
            <button type="submit" className="mr-3 shrink-0">
              送信
            </button>
          </div>
        </form>
      ) : (
        <div className="h-[60px] border-t chat-input">
          <p className="m-auto w-fit pt-6">ログインしてチャットに参加</p>
        </div>
      )}
    </div>
  );
}
