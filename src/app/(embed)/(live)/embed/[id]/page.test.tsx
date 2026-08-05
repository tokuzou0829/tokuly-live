import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import EmbedProviders from "../../../embed-providers";
import LivePage from "./page";

vi.mock("@/providers/NextAuth", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/app/(main)/live/[id]/player", () => ({
  default: ({ id }: { id: string }) => <div>{`live-player:${id}`}</div>,
}));

vi.mock("@/app/(main)/video/[id]/player", async () => {
  const { useArchivePlayback } = await import(
    "@/app/(main)/video/[id]/archive-playback-context"
  );
  return {
    default: function MockVideoPlayer({
      id,
      isUploadVideo,
    }: {
      id: string;
      isUploadVideo: boolean;
    }) {
      useArchivePlayback();
      return <div>{`archive-player:${id}:upload=${isUploadVideo}`}</div>;
    },
  };
});

function mockStream(status: string, archiveAvailable = false) {
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      if (String(input).includes("/live/stream/data")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              id: 123,
              status,
              thumbnail_url: "https://example.test/thumbnail.jpg",
              static_thumbnail_url: "https://example.test/static-thumbnail.jpg",
              subtitles: [],
            }),
        });
      }

      return Promise.resolve({ ok: archiveAvailable, status: archiveAvailable ? 200 : 404 });
    })
  );
}

function renderEmbed() {
  return render(
    <EmbedProviders session={null}>
      <LivePage params={{ id: "stream-name" }} />
    </EmbedProviders>
  );
}

describe("stream embed", () => {
  afterEach(() => cleanup());

  it("renders the live player while the stream is online", async () => {
    mockStream("online");
    renderEmbed();

    expect(await screen.findByText("live-player:stream-name")).toBeInTheDocument();
  });

  it("renders an ended archive inside the playback provider", async () => {
    mockStream("end", true);
    renderEmbed();

    expect(
      await screen.findByText("archive-player:stream-name:upload=false")
    ).toBeInTheDocument();
  });

  it("renders an uploaded video inside the playback provider", async () => {
    mockStream("video", true);
    renderEmbed();

    expect(
      await screen.findByText("archive-player:stream-name:upload=true")
    ).toBeInTheDocument();
  });

  it("keeps the waiting thumbnail when an archive is unavailable", async () => {
    mockStream("end", false);
    renderEmbed();

    await waitFor(() => expect(screen.getByText("配信を開始しています")).toBeInTheDocument());
    expect(screen.queryByText(/archive-player:/)).not.toBeInTheDocument();
  });
});
