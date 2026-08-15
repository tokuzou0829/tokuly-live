"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getStreamReaction, removeStreamReaction, setStreamReaction } from "@/requests/reactions";
import type { Reaction, StreamReaction } from "@/types/reaction";
import { Loader2, ThumbsDown, ThumbsUp } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import React from "react";
import { useEffect, useState } from "react";

export default function StreamReactionButtons({
  streamId,
  initialLikeCount = 0,
  initialDislikeCount = 0,
}: {
  streamId: number;
  initialLikeCount?: number;
  initialDislikeCount?: number;
}) {
  const { data: session, status } = useSession();
  const [value, setValue] = useState<StreamReaction>({
    reaction: null,
    like_count: initialLikeCount,
    dislike_count: initialDislikeCount,
  });
  const [loadingInitial, setLoadingInitial] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);

  const token = session?.user?.access_token;

  useEffect(() => {
    setValue((current) => ({
      ...current,
      like_count: initialLikeCount,
      dislike_count: initialDislikeCount,
    }));
  }, [initialDislikeCount, initialLikeCount, streamId]);

  useEffect(() => {
    if (status !== "authenticated" || !token) return;
    let active = true;
    setLoadingInitial(true);
    setError("");
    getStreamReaction(streamId, token)
      .then((reaction) => {
        if (active) setValue(reaction);
      })
      .catch((caught) => {
        if (active) {
          setError(caught instanceof Error ? caught.message : "評価を読み込めませんでした。");
        }
      })
      .finally(() => {
        if (active) setLoadingInitial(false);
      });
    return () => {
      active = false;
    };
  }, [status, streamId, token]);

  const react = async (reaction: Reaction) => {
    if (status !== "authenticated" || !token) {
      setLoginOpen(true);
      return;
    }
    if (submitting || loadingInitial) return;
    setSubmitting(true);
    setError("");
    try {
      const next =
        value.reaction === reaction
          ? await removeStreamReaction(streamId, token)
          : await setStreamReaction(streamId, reaction, token);
      setValue(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "評価を更新できませんでした。");
    } finally {
      setSubmitting(false);
    }
  };

  const busy = loadingInitial || submitting;
  return (
    <div className="flex flex-none flex-col items-end gap-1">
      <div
        role="group"
        className="inline-flex h-10 flex-none overflow-hidden rounded-full bg-slate-100"
        aria-label="動画の評価"
      >
        <button
          type="button"
          aria-label={`いいね ${value.like_count}件`}
          aria-pressed={value.reaction === "like"}
          disabled={busy}
          onClick={() => void react("like")}
          className={`flex h-full min-w-[72px] shrink-0 items-center justify-center gap-2 whitespace-nowrap px-3 text-sm font-bold transition-colors disabled:opacity-60 ${
            value.reaction === "like"
              ? "bg-slate-950 text-white"
              : "text-slate-700 hover:bg-slate-200"
          }`}
        >
          {busy && value.reaction === "like" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ThumbsUp className="h-4 w-4" aria-hidden="true" />
          )}
          <span>{value.like_count === 0 ? "高評価" : value.like_count.toLocaleString()}</span>
        </button>
        <span className="w-px bg-slate-300" aria-hidden="true" />
        <button
          type="button"
          aria-label={`よくないね ${value.dislike_count}件`}
          aria-pressed={value.reaction === "dislike"}
          disabled={busy}
          onClick={() => void react("dislike")}
          className={`flex h-full min-w-[72px] shrink-0 items-center justify-center gap-2 whitespace-nowrap px-3 text-sm font-bold transition-colors disabled:opacity-60 ${
            value.reaction === "dislike"
              ? "bg-slate-950 text-white"
              : "text-slate-700 hover:bg-slate-200"
          }`}
        >
          {busy && value.reaction === "dislike" ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ThumbsDown className="h-4 w-4" aria-hidden="true" />
          )}
          <span>
            {value.dislike_count === 0 ? "低評価" : value.dislike_count.toLocaleString()}
          </span>
        </button>
      </div>
      {error && (
        <p role="alert" className="max-w-xs text-right text-xs text-red-600">
          {error}
        </p>
      )}

      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>ログインが必要です</DialogTitle>
            <DialogDescription>動画を評価するにはTokulyへログインしてください。</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setLoginOpen(false)}>
              キャンセル
            </Button>
            <Button
              type="button"
              onClick={() =>
                signIn("tokuly", {
                  callbackUrl: `${window.location.pathname}${window.location.search}${window.location.hash}`,
                })
              }
            >
              ログイン
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
