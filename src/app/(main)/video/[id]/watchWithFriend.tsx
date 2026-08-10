"use client";

import React, { useState } from "react";
import { type Session } from "next-auth";
import { Crown, Send } from "lucide-react";
import { useAtomValue } from "jotai";
import { AvatarGroup } from "@/components/ui/avatarGroup";
import { ChatItemView } from "@/components/chat-item";
import { ChatComposerAvatar } from "@/components/chat-composer-avatar";
import { VideoPlayerRef } from "@/atoms/watchWithFriendAtom";
import { useWatchParty } from "@/hooks/use-watch-party";

type Props = {
  id: number;
  roomId: string;
  session: Session | null;
};

export default function WatchWithFriend({ id, roomId, session }: Props) {
  const [message, setMessage] = useState("");
  const video = useAtomValue(VideoPlayerRef);
  const {
    connectionState,
    error,
    messages,
    needsPlaybackInteraction,
    resumePlayback,
    sendMessage,
    users,
  } = useWatchParty({
    accessToken: session?.user?.access_token,
    roomId,
    video,
    videoId: id,
  });
  const hasMessage = message.trim().length > 0;
  const host = users.find((user) => user.role === "host");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendMessage(message)) setMessage("");
  }

  return (
    <section className="chat-body mb-[10px] h-[600px] w-full">
      <div className="chat-label chat-party-label">
        <p>一緒に観る</p>
        <div className="flex items-center">
          <AvatarGroup avatarDataList={users} max={4} />
          {host && (
            <div className="ml-auto flex items-center rounded-full border px-[10px] py-[3px]">
              <Crown className="mr-[5px]" color="gold" aria-hidden="true" />
              <img
                alt={`${host.name}（ホスト）`}
                className="h-[30px] w-[30px] rounded-full object-cover"
                src={host.image}
              />
            </div>
          )}
        </div>
      </div>
      <div className="chat-message-box">
        {messages.map((item) => (
          <ChatItemView key={item.id} item={{ ...item, type: "chat" }} />
        ))}
        {connectionState === "connected" && (
          <>
            {!session?.user && (
              <p className="chat-status" role="status">
                ゲストとして参加中
              </p>
            )}
            <p className="chat-status" role="status" aria-live="polite">
              パーティーに接続しました
            </p>
          </>
        )}
        {connectionState === "connecting" && <p className="chat-status">接続中です…</p>}
        {connectionState === "reconnecting" && <p className="chat-status">再接続中です…</p>}
        {error && (
          <p className="chat-status text-red-600" role="alert">
            {error}
          </p>
        )}
        {needsPlaybackInteraction && (
          <button type="button" className="chat-status text-blue-600" onClick={resumePlayback}>
            クリックして動画の同期再生を開始
          </button>
        )}
      </div>
      <form onSubmit={handleSubmit} className="chat-input">
        <div className="chat-input-row">
          <ChatComposerAvatar image={session?.user?.image} name={session?.user?.name ?? "ゲスト"} />
          <input
            type="text"
            id="party-message"
            aria-label="パーティーメッセージ"
            autoComplete="off"
            maxLength={500}
            placeholder="チャット"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="chat-input-field"
            disabled={connectionState !== "connected"}
          />
          {hasMessage && (
            <button
              type="submit"
              aria-label="パーティーメッセージを送信"
              className="chat-send-button"
              disabled={connectionState !== "connected"}
            >
              <Send aria-hidden="true" size={20} />
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
