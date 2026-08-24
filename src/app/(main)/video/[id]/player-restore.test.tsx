import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ArchivePlaybackProvider } from "./archive-playback-context";
import Player from "./player";

const playbackHandlers = {
  resumePositionMs: 45000,
  onPlaying: vi.fn(),
  onPause: vi.fn(),
  onSeeked: vi.fn(),
  onEnded: vi.fn(),
  onError: vi.fn(),
};

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/hooks/use-playback-session", () => ({
  usePlaybackSession: () => playbackHandlers,
}));
vi.mock("hls.js", () => ({
  default: { isSupported: () => false },
}));

describe("Player restored position", () => {
  beforeEach(() => {
    localStorage.setItem("volume", "1");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 404 }));
    vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => undefined);
  });

  it("shows and seeks to the restored position before playback", async () => {
    const { container } = render(
      <ArchivePlaybackProvider>
        <Player
          id="video-stream-key"
          playbackContent={{ type: "video", key: "video-stream-key" }}
        />
      </ArchivePlaybackProvider>
    );
    const video = container.querySelector("video") as HTMLVideoElement;
    Object.defineProperties(video, {
      readyState: { configurable: true, value: HTMLMediaElement.HAVE_METADATA },
      duration: { configurable: true, value: 120 },
    });
    fireEvent.loadedMetadata(video);

    await waitFor(() => expect(screen.getByText("00:45")).toBeInTheDocument());
    expect(video.paused).toBe(true);
    expect(video.currentTime).toBe(45);
    expect(playbackHandlers.onPlaying).not.toHaveBeenCalled();
  });
});
