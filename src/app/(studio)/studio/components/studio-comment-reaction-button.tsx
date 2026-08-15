"use client";

import { Button } from "@/components/ui/button";
import { addStudioCommentReaction, removeStudioCommentReaction } from "@/requests/studio";
import { Heart, Loader2 } from "lucide-react";
import React, { useEffect, useState } from "react";

export default function StudioCommentReactionButton({
  streamId,
  commentId,
  token,
  initialReactedAt,
}: {
  streamId: number;
  commentId: number;
  token: string;
  initialReactedAt: string | null;
}) {
  const [reactedAt, setReactedAt] = useState(initialReactedAt);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const reacted = reactedAt !== null;

  useEffect(() => setReactedAt(initialReactedAt), [initialReactedAt]);

  async function toggleReaction() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (reacted) {
        await removeStudioCommentReaction(streamId, commentId, token);
        setReactedAt(null);
      } else {
        setReactedAt(await addStudioCommentReaction(streamId, commentId, token));
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "リアクションを更新できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  const label = reacted ? "リアクションを解除" : "リアクションする";

  return (
    <span className="inline-flex flex-col items-start">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={`h-8 w-8 shrink-0 ${reacted ? "text-rose-500" : "text-[var(--studio-muted)]"}`}
        aria-label={label}
        aria-pressed={reacted}
        onClick={() => void toggleReaction()}
        disabled={busy}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Heart className="h-4 w-4" fill={reacted ? "currentColor" : "none"} aria-hidden="true" />
        )}
      </Button>
      {error && (
        <span role="alert" className="mt-1 max-w-56 text-xs font-semibold text-rose-600">
          {error}
        </span>
      )}
    </span>
  );
}
