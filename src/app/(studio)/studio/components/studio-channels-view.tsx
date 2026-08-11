"use client";

import { Button } from "@/components/ui/button";
import type { StudioChannel } from "@/types/studio";
import { Check, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { activateStudioChannel, selectStudioChannel } from "../actions";
import ChannelCreateDialog from "@/components/channel-create-dialog";

export default function StudioChannelsView({
  token,
  channels,
  channel,
  defaultIconUrl,
}: {
  token: string;
  channels: StudioChannel[];
  channel: StudioChannel;
  defaultIconUrl: string | null;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const router = useRouter();
  const atLimit = channels.length >= 5;

  const finishCreatingChannel = async (createdChannel: StudioChannel) => {
    const selected = await activateStudioChannel(createdChannel.id);
    if (!selected) throw new Error("作成したチャンネルを選択できませんでした。");
    router.replace("/studio");
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="studio-title">すべてのチャンネル</h1>
          <p className="mt-2 text-sm text-[var(--studio-muted)]">
            あなたの所有しているすべてのチャンネルを表示しています。
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-[var(--studio-muted)]">
            {channels.length} / 5
          </span>
          <Button disabled={atLimit} onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            新しいチャンネルを作成
          </Button>
        </div>
      </div>

      {atLimit && (
        <p role="status" className="rounded-lg bg-[var(--studio-subtle)] p-3 text-sm">
          作成できるチャンネル数の上限（5件）に達しています。
        </p>
      )}

      <section className="studio-card divide-y divide-[var(--studio-border)] overflow-hidden">
        {channels.map((item) => {
          const selected = item.id === channel.id;
          return (
            <form key={item.id} action={selectStudioChannel}>
              <input type="hidden" name="channel_id" value={item.id} />
              <button
                type="submit"
                disabled={selected}
                className="flex w-full items-center gap-4 p-4 text-left transition-colors enabled:hover:bg-[var(--studio-subtle)] disabled:cursor-default sm:p-5"
                aria-label={selected ? `${item.name}（選択中）` : `${item.name}を選択`}
              >
                {item.icon_url ? (
                  <img
                    src={item.icon_url}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[var(--studio-fg)] text-lg font-bold text-[var(--studio-surface)]">
                    {item.name.slice(0, 1)}
                  </div>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{item.name}</span>
                  <span className="mt-1 block truncate text-sm text-[var(--studio-muted)]">
                    @{item.handle}
                  </span>
                </span>
                {selected && (
                  <span className="flex items-center gap-1 text-sm font-semibold">
                    <Check className="h-4 w-4" />
                    選択中
                  </span>
                )}
              </button>
            </form>
          );
        })}
      </section>

      <ChannelCreateDialog
        token={token}
        defaultIconUrl={defaultIconUrl}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={finishCreatingChannel}
      />
    </div>
  );
}
