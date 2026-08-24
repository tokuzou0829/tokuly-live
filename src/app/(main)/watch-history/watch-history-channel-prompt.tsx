"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Loader2, Plus } from "lucide-react";
import React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { OwnedChannel } from "@/types/identity";

export default function WatchHistoryChannelPrompt({ channels }: { channels: OwnedChannel[] }) {
  const { update } = useSession();
  const router = useRouter();
  const [switchingId, setSwitchingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  if (channels.length === 0) {
    return (
      <div className="mt-6 rounded-xl bg-slate-100 p-8 text-center">
        <p className="text-muted-foreground">
          視聴履歴を利用するにはチャンネルを作成してください。
        </p>
        <Button asChild className="mt-5">
          <Link href="/studio">
            <Plus className="mr-2 h-4 w-4" />
            チャンネルを作成
          </Link>
        </Button>
      </div>
    );
  }

  const selectChannel = async (channelId: number) => {
    if (switchingId !== null) return;
    setSwitchingId(channelId);
    setError("");
    try {
      const updated = await update({ activeChannelId: channelId });
      const selectedId =
        updated?.activePostingIdentity?.type === "channel"
          ? updated.activePostingIdentity.channelId
          : null;
      if (selectedId !== channelId) {
        throw new Error("選択したチャンネルへ切り替えられませんでした。");
      }
      router.refresh();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "チャンネルを選択できませんでした。"
      );
      setSwitchingId(null);
    }
  };

  return (
    <div className="mt-6 rounded-xl bg-slate-100 p-8 text-center">
      <p className="text-muted-foreground">
        視聴履歴を使用するチャンネルを選択してください。Tokulyアカウントでは視聴履歴を利用できません。
      </p>
      <Dialog>
        <DialogTrigger asChild>
          <Button className="mt-5">チャンネルを選択</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>チャンネルを選択</DialogTitle>
            <DialogDescription>視聴履歴に使用するチャンネルを選択してください。</DialogDescription>
          </DialogHeader>
          <div className="divide-y overflow-hidden rounded-lg border">
            {channels.map((channel) => (
              <button
                key={channel.id}
                type="button"
                disabled={switchingId !== null}
                className="flex w-full items-center gap-3 p-3 text-left transition-colors enabled:hover:bg-slate-100 disabled:opacity-60"
                onClick={() => void selectChannel(channel.id)}
              >
                <img
                  src={channel.profile_photo_url}
                  alt=""
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{channel.name}</span>
                  <span className="block truncate text-sm text-muted-foreground">
                    @{channel.handle}
                  </span>
                </span>
                {switchingId === channel.id && (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-label="選択中" />
                )}
              </button>
            ))}
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
