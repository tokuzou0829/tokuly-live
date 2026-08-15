"use client";

import { Button } from "@/components/ui/button";
import type { StudioStream } from "@/types/studio";
import { Check, Copy, ExternalLink } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // Clipboard APIが拒否された場合は従来方式を試す。
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand?.("copy") ?? false;
  textarea.remove();
  if (!copied) throw new Error("コピーできませんでした");
}

export function getStudioPublicUrl(
  stream: Pick<StudioStream, "status" | "stream_key" | "type" | "urls">
) {
  const contentType = stream.type === "live" && stream.status !== "end" ? "live" : "video";
  const path = `/${contentType}/${encodeURIComponent(stream.stream_key)}`;

  try {
    return new URL(path, stream.urls.public).toString();
  } catch {
    return path;
  }
}

export default function StudioPublicLink({ stream }: { stream: StudioStream }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const resetTimer = useRef<number | null>(null);
  const url = getStudioPublicUrl(stream);

  useEffect(
    () => () => {
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
    },
    []
  );

  async function copy() {
    try {
      await copyText(url);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }

    if (resetTimer.current) window.clearTimeout(resetTimer.current);
    resetTimer.current = window.setTimeout(() => setCopyState("idle"), 1_500);
  }

  return (
    <div className="min-w-0">
      <span className="studio-label">共有リンク</span>
      <div className="mt-1 flex min-w-0 items-center gap-2">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          title={url}
          aria-label="公開ページを開く"
          className="flex min-w-0 flex-1 items-center gap-1 rounded-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--studio-accent)]"
        >
          <span className="truncate font-mono text-xs">{url}</span>
          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        </a>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0"
          onClick={copy}
          aria-label="共有公開リンクをコピー"
        >
          {copyState === "copied" ? (
            <Check aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Copy aria-hidden="true" className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className={copyState === "idle" ? "sr-only" : "mt-1 text-xs"} aria-live="polite">
        {copyState === "copied" && (
          <span className="text-green-700">共有公開リンクをコピーしました。</span>
        )}
        {copyState === "error" && (
          <span className="text-red-700">共有公開リンクをコピーできませんでした。</span>
        )}
      </p>
    </div>
  );
}
