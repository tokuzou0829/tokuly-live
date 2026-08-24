"use client";

import {
  ANONYMOUS_VIEWER_STORAGE_KEY,
  finishPlaybackSession,
  sendPlaybackProgress,
  startPlaybackSession,
} from "@/requests/playback";
import type {
  PlaybackContentType,
  PlaybackFinishReason,
  PlaybackProgressState,
} from "@/types/playback";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef } from "react";

type PlaybackCredentials = {
  accessToken?: string;
  viewerToken?: string;
  viewerChannelId?: number;
};

type UsePlaybackSessionOptions = {
  enabled?: boolean;
  contentType: PlaybackContentType;
  contentKey: string;
  getPositionMs: () => number;
  onViewCountChange?: (viewCount: number) => void;
};

function safePosition(value: number): number {
  return Math.max(0, Math.round(Number.isFinite(value) ? value : 0));
}

function readViewerToken(): string | undefined {
  try {
    return window.localStorage.getItem(ANONYMOUS_VIEWER_STORAGE_KEY) || undefined;
  } catch {
    return undefined;
  }
}

function writeViewerToken(token: string): void {
  try {
    window.localStorage.setItem(ANONYMOUS_VIEWER_STORAGE_KEY, token);
  } catch {
    // Storage can be unavailable in privacy mode. Playback must continue regardless.
  }
}

export function usePlaybackSession({
  enabled = true,
  contentType,
  contentKey,
  getPositionMs,
  onViewCountChange,
}: UsePlaybackSessionOptions) {
  const { data: authSession } = useSession();
  const playbackSessionIdRef = useRef<string | null>(null);
  const clientSessionIdRef = useRef<string | null>(null);
  const startingRef = useRef(false);
  const playingRef = useRef(false);
  const finishedRef = useRef(false);
  const retryTimerRef = useRef<number | null>(null);
  const retryAttemptRef = useRef(0);
  const pendingFinishRef = useRef<{ reason: PlaybackFinishReason; keepalive: boolean } | null>(
    null
  );
  const getPositionRef = useRef(getPositionMs);
  const onViewCountRef = useRef(onViewCountChange);
  const credentialsRef = useRef<PlaybackCredentials>({});
  const sessionCredentialsRef = useRef<PlaybackCredentials | null>(null);

  getPositionRef.current = getPositionMs;
  onViewCountRef.current = onViewCountChange;

  const activeIdentity = authSession?.activePostingIdentity;
  const viewerChannelId = activeIdentity?.type === "channel" ? activeIdentity.channelId : undefined;
  const accessToken = viewerChannelId ? authSession?.user?.access_token : undefined;
  const identityKey = viewerChannelId
    ? `channel:${viewerChannelId}:${accessToken ?? ""}`
    : "anonymous";
  const previousIdentityKeyRef = useRef(identityKey);
  credentialsRef.current = viewerChannelId
    ? { viewerChannelId, accessToken }
    : { viewerToken: typeof window === "undefined" ? undefined : readViewerToken() };

  const progress = useCallback(async (state: PlaybackProgressState) => {
    const sessionId = playbackSessionIdRef.current;
    if (!sessionId || finishedRef.current) return;
    await sendPlaybackProgress(
      sessionId,
      { position_ms: safePosition(getPositionRef.current()), state },
      sessionCredentialsRef.current ?? credentialsRef.current
    ).catch(() => undefined);
  }, []);

  const finish = useCallback(async (reason: PlaybackFinishReason, keepalive = false) => {
    const sessionId = playbackSessionIdRef.current;
    if (!sessionId) {
      if (startingRef.current) pendingFinishRef.current = { reason, keepalive };
      return;
    }
    if (finishedRef.current) return;
    finishedRef.current = true;
    playbackSessionIdRef.current = null;
    startingRef.current = false;
    if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current);
    retryTimerRef.current = null;
    pendingFinishRef.current = null;
    await finishPlaybackSession(
      sessionId,
      { position_ms: safePosition(getPositionRef.current()), reason },
      { ...(sessionCredentialsRef.current ?? credentialsRef.current), keepalive }
    ).catch(() => undefined);
  }, []);

  const start = useCallback(async () => {
    if (!enabled || !playingRef.current || playbackSessionIdRef.current || startingRef.current)
      return;
    if (!clientSessionIdRef.current) clientSessionIdRef.current = crypto.randomUUID();
    startingRef.current = true;
    finishedRef.current = false;
    const credentials = credentialsRef.current;
    if (credentials.viewerChannelId && !credentials.accessToken) {
      startingRef.current = false;
      return;
    }
    try {
      const result = await startPlaybackSession(
        {
          content_type: contentType,
          content_key: contentKey,
          client_session_id: clientSessionIdRef.current,
          ...(credentials.viewerChannelId
            ? { viewer_channel_id: credentials.viewerChannelId }
            : {}),
          position_ms: safePosition(getPositionRef.current()),
        },
        credentials
      );
      playbackSessionIdRef.current = result.playback_session_id;
      sessionCredentialsRef.current = credentials;
      retryAttemptRef.current = 0;
      if (!credentials.viewerChannelId && result.viewer_token) {
        writeViewerToken(result.viewer_token);
        credentialsRef.current = { viewerToken: result.viewer_token };
      }
      onViewCountRef.current?.(result.view_count);
      const pendingFinish = pendingFinishRef.current;
      if (pendingFinish) {
        await finish(pendingFinish.reason, pendingFinish.keepalive);
        return;
      }
      if (!playingRef.current) await progress("paused");
    } catch {
      if (playingRef.current) {
        const delays = [1000, 3000, 10000];
        const delay = delays[Math.min(retryAttemptRef.current, delays.length - 1)];
        retryAttemptRef.current += 1;
        retryTimerRef.current = window.setTimeout(() => void start(), delay);
      }
    } finally {
      startingRef.current = false;
    }
  }, [contentKey, contentType, enabled, finish, progress]);

  const onPlaying = useCallback(() => {
    if (!enabled) return;
    playingRef.current = true;
    if (playbackSessionIdRef.current) void progress("playing");
    else void start();
  }, [enabled, progress, start]);

  const onPause = useCallback(() => {
    playingRef.current = false;
    void progress("paused");
  }, [progress]);

  const onSeeked = useCallback(() => {
    void progress(playingRef.current ? "playing" : "paused");
  }, [progress]);

  const onEnded = useCallback(async () => {
    playingRef.current = false;
    const completion = finish("ended");
    clientSessionIdRef.current = null;
    sessionCredentialsRef.current = null;
    finishedRef.current = false;
    await completion;
  }, [finish]);

  const onError = useCallback(() => {
    playingRef.current = false;
    void finish("error");
  }, [finish]);

  useEffect(() => {
    if (previousIdentityKeyRef.current === identityKey) return;
    previousIdentityKeyRef.current = identityKey;
    const wasPlaying = playingRef.current;
    void finish("navigation", true).finally(() => {
      clientSessionIdRef.current = null;
      sessionCredentialsRef.current = null;
      finishedRef.current = false;
      if (wasPlaying) void start();
    });
  }, [finish, identityKey, start]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (playingRef.current) void progress("playing");
    }, 15_000);
    return () => window.clearInterval(interval);
  }, [progress]);

  useEffect(() => {
    const pagehide = () => void finish("pagehide", true);
    window.addEventListener("pagehide", pagehide);
    return () => window.removeEventListener("pagehide", pagehide);
  }, [finish]);

  useEffect(() => {
    return () => {
      playingRef.current = false;
      void finish("navigation", true);
      if (retryTimerRef.current !== null) window.clearTimeout(retryTimerRef.current);
    };
  }, [contentKey, contentType, finish]);

  return { onPlaying, onPause, onSeeked, onEnded, onError };
}
