import React from "react";
import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatYen, giftStyleClass } from "@/lib/gifts";
import type { ChatItem } from "@/types/gift";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

function avatarFallback(name: string) {
  return Array.from(name.trim())[0]?.toUpperCase() ?? "?";
}

export function ChatItemView({
  item,
  compact = false,
  messageEditor,
}: {
  item: ChatItem;
  compact?: boolean;
  messageEditor?: React.ReactNode;
}) {
  if (item.type === "gift") {
    return (
      <article
        className={cn(
          "chat-message chat-gift-message border-l-4 shadow-sm",
          compact && "chat-message-compact",
          giftStyleClass(item.display_style)
        )}
        data-testid={`gift-message-${item.id}`}
      >
        <div className="chat-gift-header">
          <Avatar
            className="chat-avatar"
            style={{
              width: "var(--chat-avatar-size)",
              height: "var(--chat-avatar-size)",
              flexBasis: "var(--chat-avatar-size)",
            }}
          >
            {item.image && <AvatarImage src={item.image} alt="" />}
            <AvatarFallback className="chat-avatar-fallback">
              <Gift aria-hidden="true" className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <span className="chat-message-name">{item.name}</span>
          <strong className="chat-gift-amount">{formatYen(item.amount)}</strong>
        </div>
        {messageEditor ??
          (item.text && <p className="chat-message-text chat-gift-text">{item.text}</p>)}
      </article>
    );
  }

  return (
    <article className={cn("chat-message", compact && "chat-message-compact")}>
      <Avatar
        className="chat-avatar"
        style={{
          width: "var(--chat-avatar-size)",
          height: "var(--chat-avatar-size)",
          flexBasis: "var(--chat-avatar-size)",
        }}
      >
        {item.image && <AvatarImage src={item.image} alt="" />}
        <AvatarFallback className="chat-avatar-fallback">
          {avatarFallback(item.name)}
        </AvatarFallback>
      </Avatar>
      <div className="chat-message-content">
        <span className="chat-message-name">{item.name}</span>
        <span className="chat-message-text">{item.text}</span>
      </div>
    </article>
  );
}
