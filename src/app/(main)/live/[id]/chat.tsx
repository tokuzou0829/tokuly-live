"use client";

import React, { useEffect, useMemo, useState } from "react";
import io, { Socket } from "socket.io-client";
import { type Session } from "next-auth";
import { Send } from "lucide-react";
import { ChatItemView } from "@/components/chat-item";
import { ChatComposerAvatar } from "@/components/chat-composer-avatar";
import { GiftPopover } from "@/components/gift-popover";
import { mergeChatItems, normalizeChatItem, normalizeChatItems } from "@/lib/gifts";
import type { ChatItem } from "@/types/gift";
import { notifyTokulyUnauthorized } from "@/lib/auth-session-events";

interface ChatProps {
  id: number;
  channelId?: number;
  giftsEnabled?: boolean;
  session: Session | null;
  postingIdentityOverride?: {
    channelId: number;
    name: string;
    image: string | null;
  };
}

export default function Chat({
  id,
  channelId,
  giftsEnabled = false,
  session,
  postingIdentityOverride,
}: ChatProps) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [msg, setMsg] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<ChatItem[]>([]);
  const [historyMessages, setHistoryMessages] = useState<ChatItem[]>([]);
  const accessToken = session?.user?.access_token;
  const postingIdentity = session?.activePostingIdentity;
  const postingChannelId =
    postingIdentityOverride?.channelId ??
    (postingIdentity?.type === "channel" ? postingIdentity.channelId : undefined);
  const postingName = postingIdentityOverride?.name ?? postingIdentity?.name ?? session?.user?.name;
  const postingImage =
    postingIdentityOverride?.image ?? postingIdentity?.profilePhotoUrl ?? session?.user?.image;
  const hasMessage = msg.trim().length > 0;

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
    <section className="chat-body h-[calc(100vh-6rem)] min-h-[360px] max-h-[600px] w-full">
      <div className="chat-label">
        <p>チャット</p>
      </div>
      <div className="chat-message-box">
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
        {isConnected && (
          <p className="chat-status" role="status" aria-live="polite">
            チャットに接続しました
          </p>
        )}
      </div>
      {session?.user ? (
        <form onSubmit={handleSubmit} className="chat-input">
          <div className="chat-input-row">
            <ChatComposerAvatar image={postingImage} name={postingName} />
            <input
              type="text"
              id="msg"
              aria-label="チャットメッセージ"
              autoComplete="off"
              placeholder="チャット"
              value={msg}
              onChange={(event) => setMsg(event.target.value)}
              className="chat-input-field"
            />
            {!hasMessage &&
              giftsEnabled &&
              accessToken &&
              channelId !== undefined &&
              Number.isFinite(channelId) && (
                <GiftPopover
                  channelId={channelId}
                  liveStreamId={id}
                  token={accessToken}
                  senderChannelId={postingChannelId}
                  senderName={postingName}
                  senderImage={postingImage}
                />
              )}
            {hasMessage && (
              <button type="submit" aria-label="チャットを送信" className="chat-send-button">
                <Send aria-hidden="true" size={20} />
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="chat-input chat-footer-message chat-login-message">
          <p>ログインしてチャットに参加</p>
        </div>
      )}
    </section>
  );
}
