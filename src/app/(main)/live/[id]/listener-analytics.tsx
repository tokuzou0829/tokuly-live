"use client";

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { Session } from "next-auth";
import io, { type Socket } from "socket.io-client";
import { notifyTokulyUnauthorized } from "@/lib/auth-session-events";

const LISTENER_ID_KEY = "tokuly_listener_id";
const HEARTBEAT_INTERVAL_MS = 15_000;

let sessionListenerId: string | null = null;

type ListenerCountPayload = {
  stream_id: number;
  count: number;
  measured_at: string;
};

type ListenerAnalyticsContextValue = {
  listenerCount: number;
  startListening: () => void;
  stopListening: () => void;
};

const ListenerAnalyticsContext = createContext<ListenerAnalyticsContextValue>({
  listenerCount: 0,
  startListening: () => undefined,
  stopListening: () => undefined,
});

function createListenerId() {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replaceAll("-", "");
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function getListenerId() {
  if (sessionListenerId) return sessionListenerId;

  try {
    const storedId = window.localStorage.getItem(LISTENER_ID_KEY);
    if (storedId && storedId.length >= 16 && storedId.length <= 128) {
      sessionListenerId = storedId;
      return storedId;
    }
  } catch {
    // localStorageを利用できない場合は、このページセッション内のIDを使用する。
  }

  sessionListenerId = createListenerId();
  try {
    window.localStorage.setItem(LISTENER_ID_KEY, sessionListenerId);
  } catch {
    // sessionListenerIdには保持済みなので、そのまま継続できる。
  }
  return sessionListenerId;
}

type ProviderProps = {
  children: React.ReactNode;
  session: Session | null;
  streamId: number;
};

export function ListenerAnalyticsProvider({ children, session, streamId }: ProviderProps) {
  const [listenerCount, setListenerCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);
  const heartbeatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPlayingRef = useRef(false);
  const joinedRef = useRef(false);

  const clearHeartbeat = useCallback(() => {
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
  }, []);

  const emitStart = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || !joinedRef.current || !isPlayingRef.current) return;

    socket.emit("listener:start", { listener_id: getListenerId() });
    clearHeartbeat();
    heartbeatTimerRef.current = setInterval(() => {
      if (isPlayingRef.current && joinedRef.current) {
        socketRef.current?.emit("listener:heartbeat", {});
      }
    }, HEARTBEAT_INTERVAL_MS);
  }, [clearHeartbeat]);

  const startListening = useCallback(() => {
    isPlayingRef.current = true;
    emitStart();
  }, [emitStart]);

  const stopListening = useCallback(() => {
    const wasPlaying = isPlayingRef.current;
    isPlayingRef.current = false;
    clearHeartbeat();
    if (wasPlaying && joinedRef.current) {
      socketRef.current?.emit("listener:stop", {});
    }
  }, [clearHeartbeat]);

  useEffect(() => {
    const socket = io("https://live-data.tokuly.com", {
      path: "/chat/socket.io/",
      autoConnect: false,
    });
    socketRef.current = socket;
    let disposed = false;

    const handleJoined = () => {
      joinedRef.current = true;
      if (isPlayingRef.current) emitStart();
    };
    const handleDisconnect = () => {
      joinedRef.current = false;
      clearHeartbeat();
    };
    const handleCount = (payload: ListenerCountPayload) => {
      if (
        Number(payload?.stream_id) === streamId &&
        Number.isFinite(payload?.count) &&
        payload.count >= 0
      ) {
        setListenerCount(payload.count);
      }
    };
    const handlePageHide = () => stopListening();

    socket.on("chat:joined", handleJoined);
    socket.on("disconnect", handleDisconnect);
    socket.on("listener:count", handleCount);
    window.addEventListener("pagehide", handlePageHide);

    async function connect() {
      let joinPayload: { roomId: number; name: string; token: string } = {
        roomId: streamId,
        name: "guest",
        token: "guest",
      };

      const accessToken = session?.user?.access_token;
      if (session?.user && accessToken) {
        const postingIdentity = session.activePostingIdentity;
        const postingChannelId =
          postingIdentity?.type === "channel" ? postingIdentity.channelId : undefined;
        const response = await fetch("https://live-data.tokuly.com/chat-auth/", {
          method: "POST",
          body: JSON.stringify({
            token: accessToken,
            ...(postingChannelId === undefined ? {} : { channel_id: postingChannelId }),
          }),
          headers: { "Content-Type": "application/json" },
        });
        if (response.status === 401) {
          notifyTokulyUnauthorized();
          return;
        }
        if (!response.ok) throw new Error("リスナー認証に失敗しました");
        const chatKey = await response.json();
        joinPayload = {
          roomId: streamId,
          name: postingIdentity?.name ?? session.user.name ?? "user",
          token: chatKey.authKey,
        };
      }

      if (disposed) return;
      socket.on("connect", () => socket.emit("join", joinPayload));
      socket.connect();
    }

    connect().catch((error) => console.error("Listener analytics connection failed:", error));

    return () => {
      disposed = true;
      stopListening();
      window.removeEventListener("pagehide", handlePageHide);
      socket.off("chat:joined", handleJoined);
      socket.off("disconnect", handleDisconnect);
      socket.off("listener:count", handleCount);
      socket.disconnect();
      socketRef.current = null;
      joinedRef.current = false;
    };
  }, [clearHeartbeat, emitStart, session, stopListening, streamId]);

  return (
    <ListenerAnalyticsContext.Provider value={{ listenerCount, startListening, stopListening }}>
      {children}
    </ListenerAnalyticsContext.Provider>
  );
}

export function useListenerAnalytics() {
  return useContext(ListenerAnalyticsContext);
}
