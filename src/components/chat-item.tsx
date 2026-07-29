import React from "react";
import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatYen, giftStyleClass } from "@/lib/gifts";
import type { ChatItem } from "@/types/gift";

export function ChatItemView({ item, compact = false }: { item: ChatItem; compact?: boolean }) {
  if (item.type === "gift") {
    return (
      <article
        className={cn(
          "m-1 rounded-lg border-l-4 px-3 py-2 shadow-sm",
          giftStyleClass(item.display_style)
        )}
        data-testid={`gift-message-${item.id}`}
      >
        <div className="flex items-center gap-2">
          {item.image && !compact ? (
            <img src={item.image} alt="" className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <Gift aria-hidden="true" className="h-5 w-5 shrink-0" />
          )}
          <span className="min-w-0 truncate text-sm font-semibold">{item.name}</span>
          <strong className="ml-auto whitespace-nowrap text-base">{formatYen(item.amount)}</strong>
        </div>
        {item.text && <p className="mt-1 break-words text-sm">{item.text}</p>}
      </article>
    );
  }

  return (
    <div className="m-1 flex items-center chat-message">
      {item.image && !compact && (
        <img src={item.image} alt="" className="mr-1 h-5 w-5 rounded-full object-cover" />
      )}
      <span className="mr-2 max-w-[40%] shrink-0 truncate text-sm text-gray-500 chat-message-name">
        {item.name}
      </span>
      <span className="break-words text-base chat-message-text">{item.text}</span>
    </div>
  );
}
