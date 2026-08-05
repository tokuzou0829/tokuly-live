"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

type ArchivePlaybackContextValue = {
  currentTime: number;
  setCurrentTime: (time: number) => void;
};

const ArchivePlaybackContext = createContext<ArchivePlaybackContextValue | null>(null);

export function ArchivePlaybackProvider({ children }: { children: React.ReactNode }) {
  const [currentTime, setCurrentTime] = useState(0);
  const value = useMemo(() => ({ currentTime, setCurrentTime }), [currentTime]);

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
