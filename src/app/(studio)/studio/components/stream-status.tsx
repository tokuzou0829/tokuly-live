import React from "react";
import type { StudioStreamStatus } from "@/types/studio";

const labels: Record<StudioStreamStatus, string> = {
  online: "配信中",
  offline: "配信待ち",
  end: "終了",
  video: "動画",
};

export default function StreamStatus({ status }: { status: StudioStreamStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
        status === "online"
          ? "bg-[var(--studio-fg)] text-[var(--studio-surface)]"
          : status === "offline"
            ? "border border-[var(--studio-fg)] text-[var(--studio-fg)]"
            : "bg-[var(--studio-subtle)] text-[var(--studio-muted)]"
      }`}
    >
      {labels[status]}
    </span>
  );
}
