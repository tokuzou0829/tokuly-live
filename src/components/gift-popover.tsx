"use client";

import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GiftSessionForm } from "@/components/gift-session-form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Props = {
  channelId: number;
  liveStreamId: number;
  token: string;
};

export function GiftPopover({ channelId, liveStreamId, token }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon" aria-label="ギフト付きメッセージを送る">
          <Gift className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="end"
        collisionPadding={12}
        className="max-h-[min(70vh,620px)] w-[min(390px,calc(100vw-24px))] overflow-y-auto p-0"
      >
        <GiftSessionForm channelId={channelId} liveStreamId={liveStreamId} token={token} compact />
      </PopoverContent>
    </Popover>
  );
}
