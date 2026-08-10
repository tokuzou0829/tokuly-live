"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSetAtom } from "jotai";
import { io, type Socket } from "socket.io-client";
import { notifyTokulyUnauthorized } from "@/lib/auth-session-events";
import {
  parseWatchPartyAck,
  parseWatchPartyError,
  parseWatchPartyJoinResult,
  parseWatchPartyMessage,
  parseWatchPartyPlayback,
  parseWatchPartyUsers,
} from "@/lib/watch-party-validation";
import { IsPartyHost, WatchPartyConnectionStatus } from "@/atoms/watchWithFriendAtom";
import type {
  WatchPartyMessage,
  WatchPartyParticipant,
  WatchPartyPlayback,
} from "@/types/watch-party";

type PlaybackReason = "play" | "pause" | "seek" | "heartbeat";

type ServerToClientEvents = {
  "party:message": (message: unknown) => void;
  "party:playback": (playback: unknown) => void;
  "party:presence": (payload: unknown) => void;
  "party:error": (error: unknown) => void;
};

type ClientToServerEvents = {
  "party:join": (
    payload: { roomId: string; videoId: number },
    ack: (response: unknown) => void
  ) => void;
  "party:message": (payload: { text: string }, ack: (response: unknown) => void) => void;
  "party:playback": (
    payload: { currentTime: number; playing: boolean; reason: PlaybackReason },
    ack: (response: unknown) => void
  ) => void;
};

type ConnectionState = "connecting" | "connected" | "reconnecting" | "error";

type Options = {
  accessToken?: string;
  roomId: string;
  video: HTMLVideoElement | null;
  videoId: number;
};

const SOCKET_URL = "https://live-data.tokuly.com";
const SOCKET_PATH = "/wwf/socket.io/";

export function useWatchParty({ accessToken, roomId, video, videoId }: Options) {
  const [connectionState, setConnectionState] = useState<ConnectionState>("connecting");
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<WatchPartyMessage[]>([]);
  const [needsPlaybackInteraction, setNeedsPlaybackInteraction] = useState(false);
  const [self, setSelf] = useState<WatchPartyParticipant | null>(null);
  const [users, setUsers] = useState<WatchPartyParticipant[]>([]);
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const selfIdRef = useRef<string | null>(null);
  const serverClockOffsetRef = useRef(0);
  const setIsHost = useSetAtom(IsPartyHost);
  const setGlobalConnectionState = useSetAtom(WatchPartyConnectionStatus);
  const isHost = self?.role === "host";

  const applyPlayback = useCallback(
    (playback: WatchPartyPlayback) => {
      if (!video) return;
      try {
        const serverNow = Date.now() + serverClockOffsetRef.current;
        const elapsed = playback.playing ? Math.max(0, serverNow - playback.serverTime) / 1000 : 0;
        const expectedTime = playback.currentTime + elapsed;

        if (Math.abs(video.currentTime - expectedTime) > 1.5) video.currentTime = expectedTime;
        if (playback.playing) {
          void video
            .play()
            .then(() => setNeedsPlaybackInteraction(false))
            .catch(() => setNeedsPlaybackInteraction(true));
        } else {
          video.pause();
          setNeedsPlaybackInteraction(false);
        }
      } catch {
        setError("動画の同期状態を適用できませんでした");
      }
    },
    [video]
  );

  useEffect(() => {
    setConnectionState("connecting");
    setGlobalConnectionState("connecting");
    setError(null);

    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SOCKET_URL, {
      path: SOCKET_PATH,
      autoConnect: false,
      auth: accessToken ? { accessToken } : {},
    });
    socketRef.current = socket;

    const reportProtocolError = () => setError("サーバーから不正なデータを受信しました");
    const updatePresence = (payload: unknown) => {
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        reportProtocolError();
        return;
      }
      const nextUsers = parseWatchPartyUsers((payload as Record<string, unknown>).users);
      if (!nextUsers) {
        reportProtocolError();
        return;
      }
      setUsers(nextUsers);
      const nextSelf = nextUsers.find((user) => user.id === selfIdRef.current) ?? null;
      if (nextSelf) {
        setSelf(nextSelf);
        setIsHost(nextSelf.role === "host");
      }
    };
    const handleMessage = (value: unknown) => {
      const message = parseWatchPartyMessage(value);
      if (!message) {
        reportProtocolError();
        return;
      }
      setMessages((previous) => [message, ...previous]);
    };
    const handlePlayback = (value: unknown) => {
      const playback = parseWatchPartyPlayback(value);
      if (!playback) {
        reportProtocolError();
        return;
      }
      applyPlayback(playback);
    };
    const handlePartyError = (value: unknown) => {
      const partyError = parseWatchPartyError(value);
      setError(partyError?.message ?? "サーバーから不正なエラー応答を受信しました");
    };
    const handleDisconnect = () => {
      selfIdRef.current = null;
      setSelf(null);
      setIsHost(false);
      setConnectionState("reconnecting");
      setGlobalConnectionState("reconnecting");
    };
    const handleConnectError = (value: unknown) => {
      const connectError =
        value && typeof value === "object"
          ? (value as { data?: unknown; message?: unknown })
          : null;
      const errorData = parseWatchPartyError(connectError?.data);
      if (errorData?.code === "AUTH_FAILED") notifyTokulyUnauthorized();
      setConnectionState("error");
      setGlobalConnectionState("error");
      setError(
        errorData?.message ??
          (typeof connectError?.message === "string"
            ? connectError.message
            : "パーティーに接続できませんでした")
      );
    };
    const handleConnect = () => {
      const requestStartedAt = Date.now();
      socket.emit("party:join", { roomId, videoId }, (value) => {
        const response = parseWatchPartyAck(value, parseWatchPartyJoinResult);
        if (!response) {
          setConnectionState("error");
          setGlobalConnectionState("error");
          reportProtocolError();
          return;
        }
        if (!response.ok) {
          setConnectionState("error");
          setGlobalConnectionState("error");
          setError(response.error.message);
          return;
        }

        const receivedAt = Date.now();
        serverClockOffsetRef.current =
          response.data.serverTime - (requestStartedAt + receivedAt) / 2;
        selfIdRef.current = response.data.self.id;
        setSelf(response.data.self);
        setUsers(response.data.users);
        setIsHost(response.data.self.role === "host");
        setConnectionState("connected");
        setGlobalConnectionState("connected");
        setError(null);
        if (response.data.self.role !== "host") applyPlayback(response.data.playback);
      });
    };

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);
    socket.on("disconnect", handleDisconnect);
    socket.on("party:error", handlePartyError);
    socket.on("party:message", handleMessage);
    socket.on("party:playback", handlePlayback);
    socket.on("party:presence", updatePresence);
    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
      socket.off("disconnect", handleDisconnect);
      socket.off("party:error", handlePartyError);
      socket.off("party:message", handleMessage);
      socket.off("party:playback", handlePlayback);
      socket.off("party:presence", updatePresence);
      socket.disconnect();
      socketRef.current = null;
      selfIdRef.current = null;
      setIsHost(false);
      setGlobalConnectionState("idle");
    };
  }, [accessToken, applyPlayback, roomId, setGlobalConnectionState, setIsHost, videoId]);

  const sendPlayback = useCallback(
    (reason: PlaybackReason) => {
      const socket = socketRef.current;
      if (!socket || !video) return;
      socket.emit(
        "party:playback",
        { currentTime: video.currentTime, playing: !video.paused, reason },
        (value) => {
          const response = parseWatchPartyAck(value, parseWatchPartyPlayback);
          if (!response) {
            setError("サーバーから不正なデータを受信しました");
            return;
          }
          if (!response.ok) setError(response.error.message);
        }
      );
    },
    [video]
  );

  useEffect(() => {
    if (!isHost || !video) return;
    const handlePlay = () => sendPlayback("play");
    const handlePause = () => sendPlayback("pause");
    const handleSeeked = () => sendPlayback("seek");
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("seeked", handleSeeked);
    const heartbeat = window.setInterval(() => sendPlayback("heartbeat"), 5000);

    return () => {
      window.clearInterval(heartbeat);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("seeked", handleSeeked);
    };
  }, [isHost, sendPlayback, video]);

  const sendMessage = useCallback((text: string) => {
    if (typeof text !== "string") return false;
    const normalizedText = text.trim();
    const socket = socketRef.current;
    if (!socket || normalizedText.length === 0 || normalizedText.length > 500) return false;
    socket.emit("party:message", { text: normalizedText }, (value) => {
      const response = parseWatchPartyAck(value, parseWatchPartyMessage);
      if (!response) {
        setError("サーバーから不正なデータを受信しました");
        return;
      }
      if (!response.ok) setError(response.error.message);
    });
    return true;
  }, []);

  const resumePlayback = useCallback(() => {
    if (!video) return;
    void video
      .play()
      .then(() => setNeedsPlaybackInteraction(false))
      .catch(() => setNeedsPlaybackInteraction(true));
  }, [video]);

  return {
    connectionState,
    error,
    isHost,
    messages,
    needsPlaybackInteraction,
    resumePlayback,
    self,
    sendMessage,
    users,
  };
}
