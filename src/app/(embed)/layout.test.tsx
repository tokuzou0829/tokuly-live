import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useArchivePlayback } from "@/app/(main)/video/[id]/archive-playback-context";
import EmbedProviders from "./embed-providers";

vi.mock("@/providers/NextAuth", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

function PlaybackContextProbe() {
  const { currentTime, isEnded } = useArchivePlayback();
  return <div>{`playback:${currentTime}:${isEnded}`}</div>;
}

describe("embed providers", () => {
  afterEach(() => cleanup());

  it("provides archive playback context to every embed route", () => {
    render(
      <EmbedProviders session={null}>
        <PlaybackContextProbe />
      </EmbedProviders>
    );

    expect(screen.getByText("playback:0:false")).toBeInTheDocument();
  });
});
