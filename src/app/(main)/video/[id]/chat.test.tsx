import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Chat from "./chat";
import { ArchivePlaybackProvider, useArchivePlayback } from "./archive-playback-context";

function ArchiveChatHarness() {
  const { setCurrentTime } = useArchivePlayback();
  return (
    <>
      <button onClick={() => setCurrentTime(2)}>seek forward</button>
      <button onClick={() => setCurrentTime(0)}>seek backward</button>
      <Chat id={123} />
    </>
  );
}

describe("archive chat timeline", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue([
          {
            id: 1,
            type: "chat",
            name: "Alice",
            text: "at start",
            playback_offset_ms: 0,
            occurred_at: "2026-08-05T12:00:00+09:00",
          },
          {
            id: 2,
            type: "chat",
            name: "Bob",
            text: "without offset",
            playback_offset_ms: null,
            occurred_at: "2026-08-05T12:00:01+09:00",
          },
          {
            id: 3,
            type: "chat",
            name: "Carol",
            text: "after one second",
            playback_offset_ms: 1_000,
            occurred_at: "2026-08-05T12:00:02+09:00",
          },
        ]),
      })
    );
  });

  afterEach(() => cleanup());

  it("requests archive history and follows forward and backward seeks", async () => {
    render(
      <ArchivePlaybackProvider>
        <ArchiveChatHarness />
      </ArchivePlaybackProvider>
    );

    await waitFor(() => expect(screen.getByText("at start")).toBeInTheDocument());
    expect(screen.getByText("without offset")).toBeInTheDocument();
    expect(screen.queryByText("after one second")).not.toBeInTheDocument();

    const [, request] = vi.mocked(fetch).mock.calls[0];
    expect(request).toEqual(
      expect.objectContaining({
        method: "POST",
        body: "stream_id=123&archive=true",
      })
    );

    fireEvent.click(screen.getByRole("button", { name: "seek forward" }));
    expect(screen.getByText("after one second")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "seek backward" }));
    expect(screen.queryByText("after one second")).not.toBeInTheDocument();
  });
});
