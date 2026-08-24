"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

export type ArchivePlaybackController = {
  seekTo: (time: number) => void;
  play: () => Promise<void>;
  pause: () => void;
};

type ArchivePlaybackContextValue = {
  currentTime: number;
  setCurrentTime: (time: number) => void;
  duration: number;
  setDuration: (duration: number) => void;
  isEnded: boolean;
  setIsEnded: (isEnded: boolean) => void;
  viewCount: number | undefined;
  registerController: (controller: ArchivePlaybackController | null) => void;
  seekTo: (time: number) => void;
  play: () => Promise<void>;
  pause: () => void;
};

const ArchivePlaybackContext = createContext<ArchivePlaybackContextValue | null>(null);

export function ArchivePlaybackProvider({
  children,
  initialViewCount,
}: {
  children: React.ReactNode;
  initialViewCount?: number;
}) {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isEnded, setIsEnded] = useState(false);
  const [viewCount] = useState<number | undefined>(initialViewCount);
  const controller = useRef<ArchivePlaybackController | null>(null);
  const registerController = useCallback((next: ArchivePlaybackController | null) => {
    controller.current = next;
  }, []);
  const seekTo = useCallback((time: number) => controller.current?.seekTo(time), []);
  const play = useCallback(async () => {
    await controller.current?.play();
  }, []);
  const pause = useCallback(() => controller.current?.pause(), []);
  const value = useMemo(
    () => ({
      currentTime,
      setCurrentTime,
      duration,
      setDuration,
      isEnded,
      setIsEnded,
      viewCount,
      registerController,
      seekTo,
      play,
      pause,
    }),
    [currentTime, duration, isEnded, pause, play, registerController, seekTo, viewCount]
  );

  return (
    <ArchivePlaybackContext.Provider value={value}>{children}</ArchivePlaybackContext.Provider>
  );
}

export function useArchivePlayback(): ArchivePlaybackContextValue {
  const context = useContext(ArchivePlaybackContext);
  if (!context) {
    throw new Error("useArchivePlayback must be used within ArchivePlaybackProvider");
  }
  return context;
}
