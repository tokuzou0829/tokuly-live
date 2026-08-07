import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function avatarFallback(name: string) {
  return Array.from(name.trim())[0]?.toUpperCase() ?? "?";
}

export function ChatComposerAvatar({
  image,
  name,
}: {
  image?: string | null;
  name?: string | null;
}) {
  const displayName = name?.trim() || "ユーザー";

  return (
    <Avatar
      className="chat-composer-avatar"
      aria-label={`${displayName}として送信`}
      style={{
        width: "var(--chat-composer-avatar-size)",
        height: "var(--chat-composer-avatar-size)",
        flexBasis: "var(--chat-composer-avatar-size)",
      }}
    >
      {image && <AvatarImage src={image} alt="" />}
      <AvatarFallback className="chat-avatar-fallback">
        {avatarFallback(displayName)}
      </AvatarFallback>
    </Avatar>
  );
}
