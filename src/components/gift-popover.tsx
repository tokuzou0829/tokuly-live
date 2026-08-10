"use client";

import React from "react";

import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GiftSessionForm } from "@/components/gift-session-form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Props = {
  channelId: number;
  liveStreamId: number;
  token: string;
  senderChannelId?: number;
  senderName?: string | null;
  senderImage?: string | null;
};

export function GiftPopover({
  channelId,
  liveStreamId,
  token,
  senderChannelId,
  senderName,
  senderImage,
}: Props) {
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const [chatBoundary, setChatBoundary] = React.useState<HTMLElement | null>(null);
  const [contentSize, setContentSize] = React.useState<React.CSSProperties>({});

  React.useLayoutEffect(() => {
    const boundary = triggerRef.current?.closest<HTMLElement>(".chat-body") ?? null;
    setChatBoundary(boundary);
    if (!boundary) return;

    const updateSize = () => {
      if (boundary.clientWidth < 24 || boundary.clientHeight < 24) return;
      setContentSize({
        width: Math.min(430, Math.max(0, boundary.clientWidth - 16)),
        maxHeight: Math.min(720, Math.max(0, boundary.clientHeight - 16)),
      });
    };
    updateSize();

    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateSize);
    observer?.observe(boundary);
    window.addEventListener("resize", updateSize);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          size="icon"
          aria-label="ギフト付きメッセージを送る"
          className="chat-gift-button !rounded-full"
        >
          <Gift className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        collisionBoundary={chatBoundary ?? undefined}
        collisionPadding={8}
        style={contentSize}
        className="gift-popover-content w-[min(430px,calc(100vw-24px))] overflow-y-auto rounded-2xl border-[#e5e5e5] p-0 shadow-xl"
      >
        <GiftSessionForm
          channelId={channelId}
          liveStreamId={liveStreamId}
          token={token}
          senderChannelId={senderChannelId}
          senderName={senderName}
          senderImage={senderImage}
          compact
        />
      </PopoverContent>
    </Popover>
  );
}
