"use client";

import {
  ANONYMOUS_VIEWER_STORAGE_KEY,
  finishPlaybackSession,
  PlaybackApiError,
  restorePlaybackSession,
  sendPlaybackProgress,
  startPlaybackSession,
} from "@/requests/playback";
import type {
  PlaybackContentType,
  PlaybackFinishReason,
  PlaybackProgressState,
} from "@/types/playback";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";

type PlaybackCredentials = {
  accessToken?: string;
  viewerToken?: string;
  viewerChannelId?: number;
};

type RestoreState = "idle" | "pending" | "restored" | "fallback" | "blocked";
type RestoreOutcome = "restored" | "fallback" | "blocked";

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
  const { data: authSession, status: authStatus } = useSession();
  const [resumePositionMs, setResumePositionMs] = useState<number | null>(null);
  const playbackSessionIdRef = useRef<string | null>(null);
  const clientSessionIdRef = useRef<string | null>(null);
  const startingRef = useRef(false);
  const playingRef = useRef(false);
  const activatedRef = useRef(false);
  const finishedRef = useRef(false);
  const startRetryTimerRef = useRef<number | null>(null);
  const restoreRetryTimerRef = useRef<number | null>(null);
  const startRetryAttemptRef = useRef(0);
  const restoreRetryAttemptRef = useRef(0);
  const restoreStateRef = useRef<RestoreState>(contentType === "clip" ? "fallback" : "idle");
  const restorePromiseRef = useRef<Promise<RestoreOutcome> | null>(null);
  const restoreGenerationRef = useRef(0);
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
    : authStatus === "loading"
      ? "loading"
      : "anonymous";
  credentialsRef.current = viewerChannelId
    ? { viewerChannelId, accessToken }
    : { viewerToken: typeof window === "undefined" ? undefined : readViewerToken() };

  const progress = useCallback(async (state: PlaybackProgressState) => {
    const sessionId = playbackSessionIdRef.current;
    if (!sessionId || finishedRef.current) return;
    if (state === "playing") activatedRef.current = true;
    if (!activatedRef.current) return;
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

    playbackSessionIdRef.current = null;
    startingRef.current = false;
    if (startRetryTimerRef.current !== null) window.clearTimeout(startRetryTimerRef.current);
    startRetryTimerRef.current = null;
    pendingFinishRef.current = null;

    // A restored session is already paused. Do not finish it until playback really starts.
    if (!activatedRef.current) {
      sessionCredentialsRef.current = null;
      return;
    }

    finishedRef.current = true;
    activatedRef.current = false;
    await finishPlaybackSession(
      sessionId,
      { position_ms: safePosition(getPositionRef.current()), reason },
      { ...(sessionCredentialsRef.current ?? credentialsRef.current), keepalive }
    ).catch(() => undefined);
  }, []);

  const start = useCallback(async () => {
    if (
      !enabled ||
      !playingRef.current ||
      playbackSessionIdRef.current ||
      startingRef.current ||
      restoreStateRef.current !== "fallback"
    )
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
      activatedRef.current = true;
      startRetryAttemptRef.current = 0;
      if (!credentials.viewerChannelId && result.viewer_token) {
        writeViewerToken(result.viewer_token);
        credentialsRef.current = { viewerToken: result.viewer_token };
        sessionCredentialsRef.current = credentialsRef.current;
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
        const delay = delays[Math.min(startRetryAttemptRef.current, delays.length - 1)];
        startRetryAttemptRef.current += 1;
        startRetryTimerRef.current = window.setTimeout(() => void start(), delay);
      }
    } finally {
      startingRef.current = false;
    }
  }, [contentKey, contentType, enabled, finish, progress]);

  const waitForRestore = useCallback(async (): Promise<RestoreOutcome> => {
    if (restorePromiseRef.current) return restorePromiseRef.current;
    if (restoreStateRef.current === "restored") return "restored";
    if (restoreStateRef.current === "fallback") return "fallback";
    return "blocked";
  }, []);

  const onPlaying = useCallback(() => {
    if (!enabled) return;
    playingRef.current = true;
    void (async () => {
      const outcome = await waitForRestore();
      if (!playingRef.current) return;
      if (outcome === "restored") {
        if (!activatedRef.current) await progress("playing");
      } else if (outcome === "fallback") {
        await start();
      }
    })();
  }, [enabled, progress, start, waitForRestore]);

  const onPause = useCallback(() => {
    playingRef.current = false;
    void progress("paused");
  }, [progress]);

  const onSeeked = useCallback(() => {
    void progress(playingRef.current ? "playing" : "paused");
  }, [progress]);

  const onEnded = useCallback(async () => {
    playingRef.current = false;
    await finish("ended");
    clientSessionIdRef.current = null;
    sessionCredentialsRef.current = null;
    finishedRef.current = false;
    activatedRef.current = false;
    restoreStateRef.current = "fallback";
  }, [finish]);

  const onError = useCallback(() => {
    playingRef.current = false;
    void finish("error");
  }, [finish]);

  useEffect(() => {
    const generation = ++restoreGenerationRef.current;
    const cleanup = () => {
      if (generation === restoreGenerationRef.current) restoreGenerationRef.current += 1;
      if (restoreRetryTimerRef.current !== null) {
        window.clearTimeout(restoreRetryTimerRef.current);
        restoreRetryTimerRef.current = null;
      }
      restorePromiseRef.current = null;
      void finish("navigation", true);
    };
    if (restoreRetryTimerRef.current !== null) window.clearTimeout(restoreRetryTimerRef.current);
    restoreRetryTimerRef.current = null;
    restorePromiseRef.current = null;
    restoreRetryAttemptRef.current = 0;
    setResumePositionMs(null);

    if (!enabled || contentType === "clip") {
      restoreStateRef.current = "fallback";
      return cleanup;
    }
    if (authStatus === "loading") {
      restoreStateRef.current = "idle";
      return cleanup;
    }

    const credentials = credentialsRef.current;
    if (credentials.viewerChannelId && !credentials.accessToken) {
      restoreStateRef.current = "blocked";
      return cleanup;
    }
    if (!credentials.viewerChannelId && !credentials.viewerToken) {
      restoreStateRef.current = "fallback";
      return cleanup;
    }

    const attemptRestore = (): Promise<RestoreOutcome> => {
      restoreStateRef.current = "pending";
      const promise = restorePlaybackSession(
        {
          content_type: contentType,
          content_key: contentKey,
          ...(credentials.viewerChannelId
            ? { viewer_channel_id: credentials.viewerChannelId }
            : {}),
        },
        credentials
      )
        .then(async (result): Promise<RestoreOutcome> => {
          if (generation !== restoreGenerationRef.current) return "blocked";
          playbackSessionIdRef.current = result.playback_session_id;
          sessionCredentialsRef.current = credentials;
          onViewCountRef.current?.(result.view_count);
          setResumePositionMs(safePosition(result.resume_position_ms));
          restoreStateRef.current = "restored";
          restoreRetryAttemptRef.current = 0;
          if (playingRef.current) await progress("playing");
          return "restored";
        })
        .catch((error: unknown): RestoreOutcome => {
          if (generation !== restoreGenerationRef.current) return "blocked";
          if (error instanceof PlaybackApiError && error.status === 404) {
            restoreStateRef.current = "fallback";
            return "fallback";
          }

          restoreStateRef.current = "blocked";
          const delays = [1000, 3000, 10000];
          const delay = delays[Math.min(restoreRetryAttemptRef.current, delays.length - 1)];
          restoreRetryAttemptRef.current += 1;
          restoreRetryTimerRef.current = window.setTimeout(() => {
            if (generation !== restoreGenerationRef.current) return;
            restoreRetryTimerRef.current = null;
            restorePromiseRef.current = attemptRestore();
          }, delay);
          return "blocked";
        });
      restorePromiseRef.current = promise;
      void promise.finally(() => {
        if (restorePromiseRef.current === promise) restorePromiseRef.current = null;
      });
      return promise;
    };

    void attemptRestore();
    return cleanup;
  }, [authStatus, contentKey, contentType, enabled, finish, identityKey, progress]);

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
      if (startRetryTimerRef.current !== null) window.clearTimeout(startRetryTimerRef.current);
      if (restoreRetryTimerRef.current !== null) window.clearTimeout(restoreRetryTimerRef.current);
    };
  }, [contentKey, contentType, finish]);

  return { resumePositionMs, onPlaying, onPause, onSeeked, onEnded, onError };
}
