"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type ArchivePlaybackContextValue = {
  currentTime: number;
  setCurrentTime: (time: number) => void;
  isEnded: boolean;
  setIsEnded: (isEnded: boolean) => void;
};

const ArchivePlaybackContext = createContext<ArchivePlaybackContextValue | null>(null);

export function ArchivePlaybackProvider({ children }: { children: React.ReactNode }) {
  const [currentTime, setCurrentTime] = useState(0);
  const [isEnded, setIsEnded] = useState(false);
  const value = useMemo(
    () => ({ currentTime, setCurrentTime, isEnded, setIsEnded }),
    [currentTime, isEnded]
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
